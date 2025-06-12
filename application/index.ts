/**
 * Application Layer Exports
 * 
 * This file provides a clean interface for accessing all application layer components.
 * It follows the Facade pattern to simplify imports and provide a stable API
 * for the presentation and infrastructure layers.
 * 
 * The application layer contains:
 * - Use Cases: Application-specific business rules and workflows
 * - DTOs: Data Transfer Objects for external communication
 * - Mappers: Conversion utilities between domain objects and DTOs
 * - Ports: Interfaces for external dependencies
 * - Services: Application-level orchestration services
 */

// ============================================================================
// Data Transfer Objects (DTOs)
// ============================================================================

export * from './dto/student-dto';

// ============================================================================
// Mappers
// ============================================================================

export * from './mappers/student-mapper';

// ============================================================================
// Use Cases - Student Management
// ============================================================================

export * from './use-cases/student/create-student-use-case';
export * from './use-cases/student/get-student-use-case';
export * from './use-cases/student/update-student-use-case';
export * from './use-cases/student/search-students-use-case';
export * from './use-cases/student/graduate-student-use-case';

// ============================================================================
// Ports (Hexagonal Architecture Interfaces)
// ============================================================================

export * from './ports/domain-event-publisher';

// ============================================================================
// Type Definitions for Application Layer
// ============================================================================

/**
 * Common response wrapper for all use case operations
 * Provides consistent error handling and metadata across the application
 */
export interface ApplicationResponse<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** The response data (only present on success) */
  data?: T;
  /** Error information (only present on failure) */
  error?: {
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: Record<string, any>;
  };
  /** Operation metadata */
  metadata: {
    /** Timestamp when the operation was processed */
    timestamp: string;
    /** Unique identifier for request tracking */
    requestId: string;
    /** Processing time in milliseconds */
    processingTimeMs: number;
  };
}

/**
 * Pagination metadata for list-based operations
 */
export interface PaginationMetadata {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items available */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages after the current one */
  hasNextPage: boolean;
  /** Whether there are pages before the current one */
  hasPreviousPage: boolean;
}

/**
 * Standard sorting options for query operations
 */
export interface SortingOptions {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Common filter base for search operations
 */
export interface BaseFilter {
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** Date range filter */
  dateRange?: {
    start: string;
    end: string;
  };
  /** Text search query */
  searchQuery?: string;
  /** Include archived/deleted items */
  includeArchived?: boolean;
}

/**
 * Audit information for tracking changes
 */
export interface AuditInfo {
  /** When the record was created */
  createdAt: string;
  /** Who created the record */
  createdBy: string;
  /** When the record was last updated */
  updatedAt: string;
  /** Who last updated the record */
  updatedBy: string;
  /** Version number for optimistic locking */
  version: number;
}

/**
 * Configuration for use case execution
 */
export interface UseCaseConfig {
  /** Maximum execution time in milliseconds */
  timeoutMs?: number;
  /** Whether to enable detailed logging */
  enableLogging?: boolean;
  /** Retry configuration for transient failures */
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
}