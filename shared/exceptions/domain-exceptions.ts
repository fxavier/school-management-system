/**
 * Abstract base class for all domain-specific exceptions
 * Provides a consistent structure for error handling across the domain layer
 * Extends the standard Error class with additional metadata for better debugging
 */
export abstract class DomainException extends Error {
  /** Unique error code for programmatic error handling */
  abstract readonly code: string;
  
  /**
   * Creates a new domain exception
   * 
   * @param message - Human-readable error message
   * @param details - Additional context information for debugging (optional)
   */
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    // Set the prototype explicitly to maintain instanceof checks
    this.name = this.constructor.name;
    // Capture stack trace for better debugging (Node.js specific)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Exception thrown when a requested entity cannot be found in the repository
 * Commonly used in read operations when an entity with the specified ID doesn't exist
 */
export class EntityNotFoundError extends DomainException {
  /** Error code for programmatic handling */
  readonly code = 'ENTITY_NOT_FOUND';

  /**
   * Creates a new EntityNotFoundError
   * 
   * @param entityType - The type of entity that was not found (e.g., 'Student', 'Course')
   * @param id - The ID that was searched for
   * @param tenantId - The tenant context (optional)
   */
  constructor(entityType: string, id: string, tenantId?: string) {
    super(
      `${entityType} with id '${id}'${tenantId ? ` in tenant '${tenantId}'` : ''} was not found`,
      { entityType, id, tenantId }
    );
  }
}

/**
 * Exception thrown when attempting to create an entity that would violate uniqueness constraints
 * Used to enforce business rules around unique identifiers or properties
 */
export class DuplicateEntityError extends DomainException {
  /** Error code for programmatic handling */
  readonly code = 'DUPLICATE_ENTITY';

  /**
   * Creates a new DuplicateEntityError
   * 
   * @param entityType - The type of entity where duplication was detected
   * @param field - The field that must be unique (e.g., 'email', 'studentNumber')
   * @param value - The duplicate value that was found
   * @param tenantId - The tenant context (optional)
   */
  constructor(entityType: string, field: string, value: string, tenantId?: string) {
    super(
      `${entityType} with ${field} '${value}'${tenantId ? ` in tenant '${tenantId}'` : ''} already exists`,
      { entityType, field, value, tenantId }
    );
  }
}

/**
 * Exception thrown when an operation cannot be performed due to the current state of the domain
 * Used for operations that are contextually invalid (e.g., graduating a suspended student)
 */
export class InvalidOperationError extends DomainException {
  /** Error code for programmatic handling */
  readonly code = 'INVALID_OPERATION';

  /**
   * Creates a new InvalidOperationError
   * 
   * @param message - Description of why the operation is invalid
   * @param details - Additional context information (optional)
   */
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
  }
}

/**
 * Exception thrown when input data fails validation rules
 * Used for data format validation, range checks, and required field validation
 */
export class ValidationError extends DomainException {
  /** Error code for programmatic handling */
  readonly code = 'VALIDATION_ERROR';

  /**
   * Creates a new ValidationError
   * 
   * @param field - The field that failed validation
   * @param value - The invalid value that was provided
   * @param reason - Explanation of why the validation failed
   */
  constructor(field: string, value: any, reason: string) {
    super(`Validation failed for field '${field}': ${reason}`, { field, value, reason });
  }
}

/**
 * Exception thrown when a domain business rule is violated
 * Used to enforce complex business logic that goes beyond simple validation
 * Examples: enrollment age requirements, graduation eligibility, payment deadlines
 */
export class BusinessRuleViolationError extends DomainException {
  /** Error code for programmatic handling */
  readonly code = 'BUSINESS_RULE_VIOLATION';

  /**
   * Creates a new BusinessRuleViolationError
   * 
   * @param rule - The name or identifier of the violated business rule
   * @param message - Description of the rule violation
   * @param details - Additional context information (optional)
   */
  constructor(rule: string, message: string, details?: Record<string, any>) {
    super(`Business rule violation: ${rule} - ${message}`, { rule, ...details });
  }
}

/**
 * Exception thrown when optimistic locking detects concurrent modifications
 * Prevents lost updates when multiple users try to modify the same entity simultaneously
 * The client should typically retry the operation with fresh data
 */
export class ConcurrencyError extends DomainException {
  /** Error code for programmatic handling */
  readonly code = 'CONCURRENCY_ERROR';

  /**
   * Creates a new ConcurrencyError
   * 
   * @param entityType - The type of entity where the conflict occurred
   * @param id - The ID of the entity being modified
   * @param expectedVersion - The version the client expected to update
   * @param actualVersion - The current version in the database
   */
  constructor(entityType: string, id: string, expectedVersion: number, actualVersion: number) {
    super(
      `Concurrency conflict: ${entityType} with id '${id}' expected version ${expectedVersion}, but actual version is ${actualVersion}`,
      { entityType, id, expectedVersion, actualVersion }
    );
  }
}

/**
 * Exception thrown when a user lacks permission to perform an operation
 * Used to enforce authorization rules and access control
 */
export class UnauthorizedError extends DomainException {
  /** Error code for programmatic handling */
  readonly code = 'UNAUTHORIZED';

  /**
   * Creates a new UnauthorizedError
   * 
   * @param operation - The operation that was attempted
   * @param resource - The resource being accessed (optional)
   */
  constructor(operation: string, resource?: string) {
    super(
      `Unauthorized to perform '${operation}'${resource ? ` on '${resource}'` : ''}`,
      { operation, resource }
    );
  }
}