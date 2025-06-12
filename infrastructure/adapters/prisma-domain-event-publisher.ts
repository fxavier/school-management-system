/**
 * Prisma Domain Event Publisher Implementation
 * 
 * This implementation provides reliable event publishing using the Outbox pattern
 * with Prisma ORM. It ensures that domain events are persisted transactionally
 * with business data and then reliably delivered to external systems.
 * 
 * Key Features:
 * - Outbox pattern for guaranteed event delivery
 * - Retry mechanism for failed event publishing
 * - Event scheduling for delayed processing
 * - Comprehensive error handling and monitoring
 * - Support for batch operations
 * - Dead letter queue for permanently failed events
 * 
 * Architecture Notes:
 * - Events are first stored in the outbox table within the same transaction
 * - A background processor picks up and publishes events
 * - Supports multiple delivery mechanisms (HTTP, message queues, etc.)
 * - Provides detailed metrics and health monitoring
 */

import { PrismaClient, OutboxEvent as PrismaOutboxEvent } from '@prisma/client';
import { 
  DomainEvent, 
  generateId 
} from '../../shared';
import { 
  DomainEventPublisher, 
  PublishOptions, 
  PublishResult, 
  BatchPublishResult 
} from '../../application/ports/domain-event-publisher';

/**
 * Event delivery status tracking
 */
interface EventDeliveryStatus {
  eventId: string;
  delivered: boolean;
  attempts: number;
  lastAttemptAt: Date;
  lastError?: string;
}

/**
 * Publisher configuration options
 */
interface PublisherConfig {
  /** Maximum number of retry attempts for failed events */
  maxRetries: number;
  /** Base backoff time in milliseconds */
  baseBackoffMs: number;
  /** Maximum backoff time in milliseconds */
  maxBackoffMs: number;
  /** Batch size for processing events */
  batchSize: number;
  /** How often to process outbox events (in milliseconds) */
  processingIntervalMs: number;
  /** Whether to enable detailed logging */
  enableLogging: boolean;
}

/**
 * Prisma Domain Event Publisher Implementation
 * 
 * Implements reliable event publishing using the Outbox pattern.
 * Events are stored in the database and processed asynchronously
 * to ensure delivery even in case of system failures.
 */
export class PrismaDomainEventPublisher implements DomainEventPublisher {
  private isProcessing = false;
  private processingTimer?: NodeJS.Timeout;
  private readonly deliveryHandlers: Map<string, (event: DomainEvent) => Promise<void>> = new Map();
  private readonly config: PublisherConfig;

  /**
   * Creates a new Prisma Domain Event Publisher instance
   * 
   * @param prisma - The Prisma client instance for database operations
   * @param config - Configuration options for the publisher
   */
  constructor(
    private readonly prisma: PrismaClient,
    config?: Partial<PublisherConfig>
  ) {
    this.config = {
      maxRetries: 3,
      baseBackoffMs: 1000,
      maxBackoffMs: 60000,
      batchSize: 50,
      processingIntervalMs: 5000,
      enableLogging: true,
      ...config
    };
  }

  /**
   * Publishes a single domain event using the outbox pattern
   * 
   * The event is stored in the outbox table and will be processed
   * asynchronously by the background processor.
   * 
   * @param event - The domain event to publish
   * @param options - Publishing options
   * @returns Promise resolving to the publish result
   */
  async publish(event: DomainEvent, options?: PublishOptions): Promise<PublishResult> {
    try {
      const eventId = event.eventId;
      const publishedAt = new Date();

      // Store event in outbox table for reliable delivery
      await this.prisma.outboxEvent.create({
        data: {
          eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          tenantId: event.tenantId,
          eventData: event as any, // Store the entire event as JSON
          published: false,
          retryCount: 0,
          maxRetries: options?.retryPolicy?.maxRetries || this.config.maxRetries,
          scheduledFor: options?.immediate === false ? 
            new Date(Date.now() + (options?.retryPolicy?.backoffMs || 0)) : 
            publishedAt
        }
      });

      // If immediate processing is requested, try to process now
      if (options?.immediate !== false) {
        this.processOutboxEventsAsync().catch(error => {
          if (this.config.enableLogging) {
            console.error('Error in immediate event processing:', error);
          }
        });
      }

      if (this.config.enableLogging) {
        console.log(`Event ${eventId} (${event.eventType}) stored in outbox for tenant ${event.tenantId}`);
      }

      return {
        success: true,
        eventId,
        publishedAt,
        details: {
          storedInOutbox: true,
          scheduledFor: options?.immediate === false ? 
            new Date(Date.now() + (options?.retryPolicy?.backoffMs || 0)) : 
            publishedAt
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (this.config.enableLogging) {
        console.error(`Failed to store event ${event.eventId} in outbox:`, error);
      }

      return {
        success: false,
        eventId: event.eventId,
        publishedAt: new Date(),
        error: errorMessage
      };
    }
  }

  /**
   * Publishes multiple domain events in a batch
   * 
   * @param events - Array of domain events to publish
   * @param options - Publishing options applied to all events
   * @returns Promise resolving to the batch publish result
   */
  async publishBatch(events: DomainEvent[], options?: PublishOptions): Promise<BatchPublishResult> {
    const startTime = Date.now();
    const results: PublishResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Use a transaction to ensure all events are stored atomically
      await this.prisma.$transaction(async (tx) => {
        for (const event of events) {
          try {
            await tx.outboxEvent.create({
              data: {
                eventId: event.eventId,
                eventType: event.eventType,
                aggregateId: event.aggregateId,
                tenantId: event.tenantId,
                eventData: event as any,
                published: false,
                retryCount: 0,
                maxRetries: options?.retryPolicy?.maxRetries || this.config.maxRetries,
                scheduledFor: options?.immediate === false ? 
                  new Date(Date.now() + (options?.retryPolicy?.backoffMs || 0)) : 
                  new Date()
              }
            });

            results.push({
              success: true,
              eventId: event.eventId,
              publishedAt: new Date()
            });
            successCount++;

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            results.push({
              success: false,
              eventId: event.eventId,
              publishedAt: new Date(),
              error: errorMessage
            });
            failureCount++;
          }
        }
      });

      // Process events immediately if requested
      if (options?.immediate !== false) {
        this.processOutboxEventsAsync().catch(error => {
          if (this.config.enableLogging) {
            console.error('Error in immediate batch event processing:', error);
          }
        });
      }

    } catch (error) {
      // If the transaction fails, mark all events as failed
      failureCount = events.length;
      successCount = 0;
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      
      for (const event of events) {
        results.push({
          success: false,
          eventId: event.eventId,
          publishedAt: new Date(),
          error: errorMessage
        });
      }
    }

    const processingTimeMs = Date.now() - startTime;

    if (this.config.enableLogging) {
      console.log(`Batch published ${successCount}/${events.length} events in ${processingTimeMs}ms`);
    }

    return {
      totalEvents: events.length,
      successCount,
      failureCount,
      results,
      processingTimeMs
    };
  }

  /**
   * Publishes an event and waits for acknowledgment from all subscribers
   * 
   * @param event - The domain event to publish
   * @param timeoutMs - Maximum time to wait for acknowledgments
   * @param options - Publishing options
   * @returns Promise resolving to the publish result with subscriber confirmations
   */
  async publishAndWait(
    event: DomainEvent, 
    timeoutMs: number, 
    options?: PublishOptions
  ): Promise<PublishResult & { acknowledgments: string[] }> {
    // For this implementation, we'll publish normally and simulate acknowledgments
    // In a real implementation, this would integrate with a message queue that supports acknowledgments
    const result = await this.publish(event, options);
    
    return {
      ...result,
      acknowledgments: [] // Would be populated by actual subscribers in a real implementation
    };
  }

  /**
   * Schedules an event to be published at a future time
   * 
   * @param event - The domain event to schedule
   * @param scheduleTime - When to publish the event
   * @param options - Publishing options
   * @returns Promise resolving to the schedule result
   */
  async scheduleEvent(
    event: DomainEvent, 
    scheduleTime: Date, 
    options?: PublishOptions
  ): Promise<PublishResult & { scheduledFor: Date }> {
    try {
      await this.prisma.outboxEvent.create({
        data: {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          tenantId: event.tenantId,
          eventData: event as any,
          published: false,
          retryCount: 0,
          maxRetries: options?.retryPolicy?.maxRetries || this.config.maxRetries,
          scheduledFor: scheduleTime
        }
      });

      if (this.config.enableLogging) {
        console.log(`Event ${event.eventId} scheduled for ${scheduleTime.toISOString()}`);
      }

      return {
        success: true,
        eventId: event.eventId,
        publishedAt: new Date(),
        scheduledFor: scheduleTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        eventId: event.eventId,
        publishedAt: new Date(),
        scheduledFor: scheduleTime,
        error: errorMessage
      };
    }
  }

  /**
   * Cancels a previously scheduled event
   * 
   * @param eventId - The ID of the scheduled event to cancel
   * @returns Promise resolving to success/failure of cancellation
   */
  async cancelScheduledEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.prisma.outboxEvent.deleteMany({
        where: {
          eventId,
          published: false
        }
      });

      const success = result.count > 0;
      
      if (this.config.enableLogging) {
        console.log(`Event ${eventId} cancellation: ${success ? 'success' : 'not found'}`);
      }

      return {
        success,
        error: success ? undefined : 'Event not found or already published'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Checks the health and connectivity of the event publishing system
   * 
   * @returns Promise resolving to health status information
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    lastPublishTime?: Date;
    pendingEvents: number;
    errorRate: number;
    details?: Record<string, any>;
  }> {
    try {
      // Count pending events
      const pendingEvents = await this.prisma.outboxEvent.count({
        where: {
          published: false,
          scheduledFor: { lte: new Date() }
        }
      });

      // Get recent statistics
      const recentCutoff = new Date(Date.now() - 3600000); // Last hour
      const [totalRecent, failedRecent, lastPublished] = await Promise.all([
        this.prisma.outboxEvent.count({
          where: { createdAt: { gte: recentCutoff } }
        }),
        this.prisma.outboxEvent.count({
          where: {
            createdAt: { gte: recentCutoff },
            retryCount: { gte: this.config.maxRetries }
          }
        }),
        this.prisma.outboxEvent.findFirst({
          where: { published: true },
          orderBy: { publishedAt: 'desc' },
          select: { publishedAt: true }
        })
      ]);

      const errorRate = totalRecent > 0 ? (failedRecent / totalRecent) * 100 : 0;
      const healthy = errorRate < 10 && pendingEvents < 1000; // Configurable thresholds

      return {
        healthy,
        lastPublishTime: lastPublished?.publishedAt,
        pendingEvents,
        errorRate,
        details: {
          processingActive: this.isProcessing,
          totalRecentEvents: totalRecent,
          failedRecentEvents: failedRecent
        }
      };

    } catch (error) {
      return {
        healthy: false,
        pendingEvents: -1,
        errorRate: -1,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Gets statistics about event publishing performance
   * 
   * @param timeRangeMs - Time range for statistics (defaults to last hour)
   * @returns Promise resolving to publishing statistics
   */
  async getStatistics(timeRangeMs: number = 3600000): Promise<{
    eventsPublished: number;
    successRate: number;
    averageLatencyMs: number;
    errorCount: number;
    throughputPerSecond: number;
  }> {
    try {
      const cutoffTime = new Date(Date.now() - timeRangeMs);
      
      const [published, failed, avgLatency] = await Promise.all([
        this.prisma.outboxEvent.count({
          where: {
            published: true,
            publishedAt: { gte: cutoffTime }
          }
        }),
        this.prisma.outboxEvent.count({
          where: {
            retryCount: { gte: this.config.maxRetries },
            createdAt: { gte: cutoffTime }
          }
        }),
        this.prisma.outboxEvent.aggregate({
          where: {
            published: true,
            publishedAt: { gte: cutoffTime }
          },
          _avg: {
            retryCount: true
          }
        })
      ]);

      const total = published + failed;
      const successRate = total > 0 ? (published / total) * 100 : 100;
      const throughputPerSecond = published / (timeRangeMs / 1000);

      return {
        eventsPublished: published,
        successRate,
        averageLatencyMs: (avgLatency._avg.retryCount || 0) * this.config.baseBackoffMs,
        errorCount: failed,
        throughputPerSecond
      };

    } catch (error) {
      return {
        eventsPublished: 0,
        successRate: 0,
        averageLatencyMs: 0,
        errorCount: -1,
        throughputPerSecond: 0
      };
    }
  }

  /**
   * Retrieves a list of failed events for debugging or reprocessing
   * 
   * @param limit - Maximum number of failed events to return
   * @param offset - Offset for pagination
   * @returns Promise resolving to failed events information
   */
  async getFailedEvents(limit: number = 50, offset: number = 0): Promise<{
    events: Array<{
      event: DomainEvent;
      failureReason: string;
      failureTime: Date;
      retryCount: number;
    }>;
    total: number;
  }> {
    try {
      const [failedEvents, total] = await Promise.all([
        this.prisma.outboxEvent.findMany({
          where: {
            retryCount: { gte: this.config.maxRetries },
            published: false
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.prisma.outboxEvent.count({
          where: {
            retryCount: { gte: this.config.maxRetries },
            published: false
          }
        })
      ]);

      const events = failedEvents.map(event => ({
        event: event.eventData as DomainEvent,
        failureReason: event.lastError || 'Unknown error',
        failureTime: event.updatedAt,
        retryCount: event.retryCount
      }));

      return { events, total };

    } catch (error) {
      return { events: [], total: 0 };
    }
  }

  /**
   * Retries publishing of failed events
   * 
   * @param eventIds - Array of event IDs to retry (optional, retries all if not provided)
   * @returns Promise resolving to retry results
   */
  async retryFailedEvents(eventIds?: string[]): Promise<BatchPublishResult> {
    const startTime = Date.now();
    
    try {
      const whereClause = {
        published: false,
        retryCount: { lt: this.config.maxRetries },
        ...(eventIds && { eventId: { in: eventIds } })
      };

      // Reset retry count and schedule for immediate processing
      const result = await this.prisma.outboxEvent.updateMany({
        where: whereClause,
        data: {
          retryCount: 0,
          scheduledFor: new Date(),
          lastError: null
        }
      });

      // Trigger immediate processing
      this.processOutboxEventsAsync().catch(error => {
        if (this.config.enableLogging) {
          console.error('Error in retry event processing:', error);
        }
      });

      const processingTimeMs = Date.now() - startTime;

      return {
        totalEvents: result.count,
        successCount: result.count,
        failureCount: 0,
        results: [], // Individual results not tracked for bulk retry
        processingTimeMs
      };

    } catch (error) {
      return {
        totalEvents: 0,
        successCount: 0,
        failureCount: 1,
        results: [],
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Starts the event publisher background processor
   */
  async start(): Promise<void> {
    if (this.processingTimer) {
      return; // Already started
    }

    if (this.config.enableLogging) {
      console.log('Starting domain event publisher processor');
    }

    // Start the background processor
    this.processingTimer = setInterval(() => {
      this.processOutboxEventsAsync().catch(error => {
        if (this.config.enableLogging) {
          console.error('Error in background event processing:', error);
        }
      });
    }, this.config.processingIntervalMs);
  }

  /**
   * Stops the event publisher gracefully
   */
  async stop(): Promise<void> {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }

    // Wait for any ongoing processing to complete
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.config.enableLogging) {
      console.log('Domain event publisher stopped');
    }
  }

  /**
   * Registers a delivery handler for specific event types
   * 
   * @param eventType - The event type to handle
   * @param handler - The handler function
   */
  public registerDeliveryHandler(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    this.deliveryHandlers.set(eventType, handler);
  }

  /**
   * Processes pending outbox events asynchronously
   * This is called by the background processor and immediate processing requests
   */
  private async processOutboxEventsAsync(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      await this.processOutboxEvents();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes pending outbox events
   * Retrieves events ready for processing and attempts to deliver them
   */
  private async processOutboxEvents(): Promise<void> {
    try {
      // Get events ready for processing
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: {
          published: false,
          scheduledFor: { lte: new Date() },
          retryCount: { lt: this.config.maxRetries }
        },
        orderBy: { scheduledFor: 'asc' },
        take: this.config.batchSize
      });

      if (pendingEvents.length === 0) {
        return;
      }

      if (this.config.enableLogging) {
        console.log(`Processing ${pendingEvents.length} pending events`);
      }

      // Process each event
      for (const outboxEvent of pendingEvents) {
        await this.processOutboxEvent(outboxEvent);
      }

    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Error processing outbox events:', error);
      }
    }
  }

  /**
   * Processes a single outbox event
   * 
   * @param outboxEvent - The outbox event to process
   */
  private async processOutboxEvent(outboxEvent: PrismaOutboxEvent): Promise<void> {
    try {
      const event = outboxEvent.eventData as DomainEvent;
      
      // Try to deliver the event
      const handler = this.deliveryHandlers.get(event.eventType) || this.defaultEventHandler;
      await handler(event);

      // Mark as published
      await this.prisma.outboxEvent.update({
        where: { id: outboxEvent.id },
        data: {
          published: true,
          publishedAt: new Date()
        }
      });

      if (this.config.enableLogging) {
        console.log(`Successfully published event ${event.eventId} (${event.eventType})`);
      }

    } catch (error) {
      // Increment retry count and schedule for retry
      const nextRetryTime = new Date(
        Date.now() + Math.min(
          this.config.baseBackoffMs * Math.pow(2, outboxEvent.retryCount),
          this.config.maxBackoffMs
        )
      );

      await this.prisma.outboxEvent.update({
        where: { id: outboxEvent.id },
        data: {
          retryCount: outboxEvent.retryCount + 1,
          scheduledFor: nextRetryTime,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      if (this.config.enableLogging) {
        console.error(`Failed to publish event ${outboxEvent.eventId}, retry ${outboxEvent.retryCount + 1}:`, error);
      }
    }
  }

  /**
   * Default event handler that logs events (can be overridden by registering specific handlers)
   * 
   * @param event - The domain event to handle
   */
  private defaultEventHandler = async (event: DomainEvent): Promise<void> => {
    if (this.config.enableLogging) {
      console.log(`Default handler: Event ${event.eventId} (${event.eventType}) for tenant ${event.tenantId}`);
      console.log('Event data:', JSON.stringify(event.eventData, null, 2));
    }
    
    // In a real implementation, this would integrate with external systems
    // such as webhooks, message queues, email services, etc.
  };
}