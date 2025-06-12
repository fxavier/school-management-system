/**
 * Base Entity interface following DDD principles
 * All entities must have an identity and audit information
 * 
 * @template T - Type of the entity ID (defaults to string)
 */
export interface Entity<T = string> {
  /** Unique identifier for the entity */
  id: T;
  /** Timestamp when the entity was created */
  createdAt: Date;
  /** Timestamp when the entity was last updated */
  updatedAt: Date;
  /** ID of the user who created this entity (optional) */
  createdBy?: string;
  /** ID of the user who last updated this entity (optional) */
  updatedBy?: string;
}

/**
 * Aggregate Root interface extending Entity
 * Aggregates are the only objects that can be directly retrieved from repositories
 * They ensure consistency boundaries and handle domain events
 * 
 * @template T - Type of the aggregate ID (defaults to string)
 */
export interface AggregateRoot<T = string> extends Entity<T> {
  /** Version number for optimistic locking to prevent concurrent modification conflicts */
  version: number;
  /** Tenant ID for multi-tenancy support - isolates data between different organizations */
  tenantId: string;
}

/**
 * Abstract base class for Value Objects
 * Value Objects represent domain concepts that are defined by their attributes rather than identity
 * They are immutable and comparable by value, not reference
 * 
 * Examples: Email, Money, Address, Grade
 */
export abstract class ValueObject {
  /**
   * Compares this value object with another for equality
   * Must be implemented by concrete value objects
   * 
   * @param other - The value object to compare with
   * @returns true if the value objects are equal, false otherwise
   */
  public abstract equals(other: ValueObject): boolean;
  
  /**
   * Type guard to check if a value is an Entity
   * Useful for distinguishing between entities and value objects
   * 
   * @param v - The value to check
   * @returns true if the value is an Entity, false otherwise
   */
  protected static isEntity(v: any): v is Entity {
    return v instanceof Object && 'id' in v;
  }
}

/**
 * Domain Event interface for implementing event-driven architecture
 * Domain events represent something important that happened in the domain
 * They enable loose coupling between bounded contexts and trigger side effects
 * 
 * Examples: StudentEnrolled, StudentGraduated, PaymentReceived
 */
export interface DomainEvent {
  /** Unique identifier for this specific event occurrence */
  readonly eventId: string;
  /** Type/name of the event (e.g., 'student.enrolled') */
  readonly eventType: string;
  /** ID of the aggregate that generated this event */
  readonly aggregateId: string;
  /** Type of the aggregate (e.g., 'Student', 'Payment') */
  readonly aggregateType: string;
  /** Tenant ID for multi-tenancy support */
  readonly tenantId: string;
  /** When the event occurred */
  readonly occurredOn: Date;
  /** Version of the aggregate when the event was generated */
  readonly version: number;
  /** Event-specific data payload */
  readonly eventData: Record<string, any>;
}

/**
 * Generic Repository interface following the Repository pattern
 * Provides an abstraction over data access, allowing the domain layer
 * to remain independent of infrastructure concerns
 * 
 * @template T - The aggregate root type
 * @template ID - The type of the aggregate's ID
 */
export interface Repository<T extends AggregateRoot, ID = string> {
  /**
   * Finds an aggregate by its ID within a specific tenant
   * 
   * @param id - The aggregate's unique identifier
   * @param tenantId - The tenant context
   * @returns Promise resolving to the aggregate or null if not found
   */
  findById(id: ID, tenantId: string): Promise<T | null>;
  
  /**
   * Persists an aggregate (create or update)
   * 
   * @param aggregate - The aggregate to save
   */
  save(aggregate: T): Promise<void>;
  
  /**
   * Removes an aggregate from storage
   * 
   * @param id - The aggregate's unique identifier
   * @param tenantId - The tenant context
   */
  delete(id: ID, tenantId: string): Promise<void>;
}

/**
 * Use Case interface following Clean Architecture principles
 * Use cases represent application-specific business rules and orchestrate
 * the flow of data to and from entities
 * 
 * @template TRequest - Type of the input request
 * @template TResponse - Type of the response
 */
export interface UseCase<TRequest = any, TResponse = any> {
  /**
   * Executes the use case with the provided request
   * 
   * @param request - The input data for the use case
   * @returns Promise resolving to the use case result
   */
  execute(request: TRequest): Promise<TResponse>;
}

/**
 * Query interface for read-only operations
 * Queries don't modify state and are optimized for data retrieval
 * 
 * @template TResponse - Type of the query result
 */
export interface Query<TResponse = any> {
  /**
   * Executes the query
   * 
   * @returns Promise resolving to the query result
   */
  execute(): Promise<TResponse>;
}

/**
 * Command interface for write operations
 * Commands modify state and may have side effects
 * 
 * @template TResponse - Type of the command result
 */
export interface Command<TResponse = any> {
  /**
   * Executes the command
   * 
   * @returns Promise resolving to the command result
   */
  execute(): Promise<TResponse>;
}

/**
 * Result type for handling success/failure scenarios without exceptions
 * Inspired by functional programming patterns, this provides explicit error handling
 * 
 * @template T - Type of the success value
 * @template E - Type of the error (defaults to Error)
 */
export type Result<T, E = Error> = {
  isSuccess: true;
  value: T;
} | {
  isSuccess: false;
  error: E;
};

/**
 * Helper function to create a successful result
 * 
 * @template T - Type of the success value
 * @param value - The success value
 * @returns A successful Result
 */
export const Success = <T>(value: T): Result<T> => ({
  isSuccess: true,
  value,
});

/**
 * Helper function to create a failure result
 * 
 * @template T - Type of the expected success value
 * @template E - Type of the error
 * @param error - The error that occurred
 * @returns A failure Result
 */
export const Failure = <T, E = Error>(error: E): Result<T, E> => ({
  isSuccess: false,
  error,
});