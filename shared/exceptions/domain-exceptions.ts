export abstract class DomainException extends Error {
  abstract readonly code: string;
  
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class EntityNotFoundError extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';

  constructor(entityType: string, id: string, tenantId?: string) {
    super(
      `${entityType} with id '${id}'${tenantId ? ` in tenant '${tenantId}'` : ''} was not found`,
      { entityType, id, tenantId }
    );
  }
}

export class DuplicateEntityError extends DomainException {
  readonly code = 'DUPLICATE_ENTITY';

  constructor(entityType: string, field: string, value: string, tenantId?: string) {
    super(
      `${entityType} with ${field} '${value}'${tenantId ? ` in tenant '${tenantId}'` : ''} already exists`,
      { entityType, field, value, tenantId }
    );
  }
}

export class InvalidOperationError extends DomainException {
  readonly code = 'INVALID_OPERATION';

  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
  }
}

export class ValidationError extends DomainException {
  readonly code = 'VALIDATION_ERROR';

  constructor(field: string, value: any, reason: string) {
    super(`Validation failed for field '${field}': ${reason}`, { field, value, reason });
  }
}

export class BusinessRuleViolationError extends DomainException {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor(rule: string, message: string, details?: Record<string, any>) {
    super(`Business rule violation: ${rule} - ${message}`, { rule, ...details });
  }
}

export class ConcurrencyError extends DomainException {
  readonly code = 'CONCURRENCY_ERROR';

  constructor(entityType: string, id: string, expectedVersion: number, actualVersion: number) {
    super(
      `Concurrency conflict: ${entityType} with id '${id}' expected version ${expectedVersion}, but actual version is ${actualVersion}`,
      { entityType, id, expectedVersion, actualVersion }
    );
  }
}

export class UnauthorizedError extends DomainException {
  readonly code = 'UNAUTHORIZED';

  constructor(operation: string, resource?: string) {
    super(
      `Unauthorized to perform '${operation}'${resource ? ` on '${resource}'` : ''}`,
      { operation, resource }
    );
  }
}