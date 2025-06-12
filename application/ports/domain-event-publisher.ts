/**
 * Domain Event Publisher Port
 * 
 * This port defines the contract for publishing domain events to external systems.
 * It follows the Hexagonal Architecture pattern by providing an abstraction
 * that allows the application layer to publish events without depending on
 * specific infrastructure implementations.
 * 
 * The actual implementation will be provided by the infrastructure layer
 * and could use various technologies like message queues, event buses,
 * webhooks, or database-based event stores.
 * 
 * Benefits:
 * - Decouples application logic from event infrastructure
 * - Enables testing with mock implementations
 * - Supports multiple event delivery mechanisms
 * - Maintains clean architecture boundaries
 */

import { DomainEvent } from '../../shared';

/**
 * Configuration options for event publishing
 */
export interface PublishOptions {
  /** Whether to publish the event immediately or batch it */
  immediate?: boolean;
  /** Retry policy for failed event delivery */
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  /** Priority level for event processing */
  priority?: 'low' | 'normal' | 'high' | 'critical';
  /** Additional metadata for the event */
  metadata?: Record<string, any>;
}

/**
 * Result of event publishing operation
 */
export interface PublishResult {
  /** Whether the event was successfully published */
  success: boolean;
  /** Unique identifier for tracking the published event */
  eventId: string;
  /** Timestamp when the event was published */
  publishedAt: Date;
  /** Error message if publishing failed */
  error?: string;
  /** Additional details about the publishing process */
  details?: Record<string, any>;
}

/**
 * Batch publishing result for multiple events
 */
export interface BatchPublishResult {
  /** Total number of events attempted */
  totalEvents: number;
  /** Number of successfully published events */
  successCount: number;
  /** Number of failed events */
  failureCount: number;
  /** Individual results for each event */
  results: PublishResult[];
  /** Overall batch processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Domain Event Publisher interface
 * 
 * This port provides methods for publishing domain events to external systems.
 * Implementations should handle reliability, ordering, and error recovery
 * according to the specific infrastructure requirements.
 */
export interface DomainEventPublisher {
  
  /**
   * Publishes a single domain event
   * 
   * @param event - The domain event to publish
   * @param options - Publishing options (optional)
   * @returns Promise resolving to the publish result
   */
  publish(event: DomainEvent, options?: PublishOptions): Promise<PublishResult>;

  /**
   * Publishes multiple domain events in a batch
   * Useful for maintaining event ordering or improving performance
   * 
   * @param events - Array of domain events to publish
   * @param options - Publishing options applied to all events (optional)
   * @returns Promise resolving to the batch publish result
   */
  publishBatch(events: DomainEvent[], options?: PublishOptions): Promise<BatchPublishResult>;

  /**
   * Publishes an event and waits for acknowledgment from all subscribers
   * Used for critical events that require confirmation of processing
   * 
   * @param event - The domain event to publish
   * @param timeoutMs - Maximum time to wait for acknowledgments
   * @param options - Publishing options (optional)
   * @returns Promise resolving to the publish result with subscriber confirmations
   */
  publishAndWait(
    event: DomainEvent, 
    timeoutMs: number, 
    options?: PublishOptions
  ): Promise<PublishResult & { acknowledgments: string[] }>;

  /**
   * Schedules an event to be published at a future time
   * Useful for implementing saga patterns or delayed notifications
   * 
   * @param event - The domain event to schedule
   * @param scheduleTime - When to publish the event
   * @param options - Publishing options (optional)
   * @returns Promise resolving to the schedule result
   */
  scheduleEvent(
    event: DomainEvent, 
    scheduleTime: Date, 
    options?: PublishOptions
  ): Promise<PublishResult & { scheduledFor: Date }>;

  /**
   * Cancels a previously scheduled event
   * 
   * @param eventId - The ID of the scheduled event to cancel
   * @returns Promise resolving to success/failure of cancellation
   */
  cancelScheduledEvent(eventId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Checks the health and connectivity of the event publishing system
   * Used for monitoring and diagnostics
   * 
   * @returns Promise resolving to health status information
   */
  healthCheck(): Promise<{
    healthy: boolean;
    lastPublishTime?: Date;
    pendingEvents: number;
    errorRate: number;
    details?: Record<string, any>;
  }>;

  /**
   * Gets statistics about event publishing performance
   * 
   * @param timeRangeMs - Time range for statistics (optional, defaults to last hour)
   * @returns Promise resolving to publishing statistics
   */
  getStatistics(timeRangeMs?: number): Promise<{
    eventsPublished: number;
    successRate: number;
    averageLatencyMs: number;
    errorCount: number;
    throughputPerSecond: number;
  }>;

  /**
   * Retrieves a list of failed events for debugging or reprocessing
   * 
   * @param limit - Maximum number of failed events to return
   * @param offset - Offset for pagination
   * @returns Promise resolving to failed events information
   */
  getFailedEvents(limit?: number, offset?: number): Promise<{
    events: Array<{
      event: DomainEvent;
      failureReason: string;
      failureTime: Date;
      retryCount: number;
    }>;
    total: number;
  }>;

  /**
   * Retries publishing of failed events
   * 
   * @param eventIds - Array of event IDs to retry (optional, retries all if not provided)
   * @returns Promise resolving to retry results
   */
  retryFailedEvents(eventIds?: string[]): Promise<BatchPublishResult>;

  /**
   * Starts the event publisher (if it needs initialization)
   * Called during application startup
   */
  start(): Promise<void>;

  /**
   * Stops the event publisher gracefully
   * Ensures all pending events are processed before shutdown
   * Called during application shutdown
   */
  stop(): Promise<void>;
}