export interface Entity<T = string> {
  id: T;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface AggregateRoot<T = string> extends Entity<T> {
  version: number;
  tenantId: string;
}

export abstract class ValueObject {
  public abstract equals(other: ValueObject): boolean;
  
  protected static isEntity(v: any): v is Entity {
    return v instanceof Object && 'id' in v;
  }
}

export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly tenantId: string;
  readonly occurredOn: Date;
  readonly version: number;
  readonly eventData: Record<string, any>;
}

export interface Repository<T extends AggregateRoot, ID = string> {
  findById(id: ID, tenantId: string): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(id: ID, tenantId: string): Promise<void>;
}

export interface UseCase<TRequest = any, TResponse = any> {
  execute(request: TRequest): Promise<TResponse>;
}

export interface Query<TResponse = any> {
  execute(): Promise<TResponse>;
}

export interface Command<TResponse = any> {
  execute(): Promise<TResponse>;
}

export type Result<T, E = Error> = {
  isSuccess: true;
  value: T;
} | {
  isSuccess: false;
  error: E;
};

export const Success = <T>(value: T): Result<T> => ({
  isSuccess: true,
  value,
});

export const Failure = <T, E = Error>(error: E): Result<T, E> => ({
  isSuccess: false,
  error,
});