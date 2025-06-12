/**
 * Search Students Use Case
 * 
 * This use case handles searching and filtering students based on various criteria.
 * It supports pagination, sorting, and multiple filter options to provide
 * flexible student data retrieval for listing, reporting, and administrative purposes.
 * 
 * Business Rules:
 * - Search is scoped to a specific tenant
 * - Results are paginated to prevent performance issues
 * - Supports filtering by status, age, enrollment dates, medical conditions
 * - Returns summary data optimized for list views
 * 
 * This is a Query operation that does not modify system state.
 */

import { UseCase, Result, Success, Failure } from '../../../shared';
import { Student } from '../../../domain/entities/student';
import { StudentRepository, StudentSearchCriteria } from '../../../domain/repositories/student-repository';
import { StudentMapper } from '../../mappers/student-mapper';
import { StudentSearchDto, StudentSearchResultDto } from '../../dto/student-dto';

/**
 * Request DTO for the Search Students use case
 */
export interface SearchStudentsRequest {
  /** Search criteria and filters */
  searchCriteria: StudentSearchDto;
  /** ID of the user performing the search (for audit/security) */
  requestedBy: string;
}

/**
 * Response DTO for the Search Students use case
 */
export interface SearchStudentsResponse {
  /** Paginated search results with metadata */
  result: StudentSearchResultDto;
  /** Summary statistics about the search */
  summary: {
    /** Total students in the tenant (not just matching the search) */
    totalStudents: number;
    /** Number of students matching the current filter */
    filteredStudents: number;
    /** Search execution time in milliseconds */
    executionTimeMs: number;
  };
}

/**
 * Search Students Use Case Implementation
 * 
 * This use case provides comprehensive search functionality for students
 * with support for complex filtering, sorting, and pagination.
 * It's optimized for performance and provides rich metadata about results.
 */
export class SearchStudentsUseCase implements UseCase<SearchStudentsRequest, Result<SearchStudentsResponse>> {

  /**
   * Creates a new instance of the Search Students use case
   * 
   * @param studentRepository - Repository for student data access
   */
  constructor(
    private readonly studentRepository: StudentRepository
  ) {}

  /**
   * Executes the search students use case
   * 
   * This method handles the search process:
   * 1. Validates the search criteria
   * 2. Converts DTO search criteria to domain search criteria
   * 3. Executes the search with pagination
   * 4. Formats the results with metadata
   * 5. Returns paginated results with summary information
   * 
   * @param request - The search request containing criteria and pagination
   * @returns Promise resolving to Result with search results or error
   */
  async execute(request: SearchStudentsRequest): Promise<Result<SearchStudentsResponse>> {
    const startTime = Date.now();
    
    try {
      const { searchCriteria, requestedBy } = request;

      // Step 1: Validate input parameters
      this.validateRequest(request);

      // Step 2: Apply default values and normalize search criteria
      const normalizedCriteria = this.normalizeSearchCriteria(searchCriteria);

      // Step 3: Convert DTO criteria to domain search criteria
      const domainCriteria = this.mapToDomainCriteria(normalizedCriteria);

      // Step 4: Execute the search with pagination
      const searchResult = await this.studentRepository.searchStudents(
        domainCriteria,
        normalizedCriteria.tenantId,
        normalizedCriteria.limit,
        this.calculateOffset(normalizedCriteria.page!, normalizedCriteria.limit!)
      );

      // Step 5: Get total student count for summary statistics
      const totalStudents = await this.getTotalStudentCount(normalizedCriteria.tenantId);

      // Step 6: Convert results to DTOs with pagination metadata
      const resultDto = StudentMapper.toSearchResultDto(
        searchResult.students,
        searchResult.total,
        normalizedCriteria.page!,
        normalizedCriteria.limit!
      );

      // Step 7: Calculate execution time and build response
      const executionTimeMs = Date.now() - startTime;

      return Success({
        result: resultDto,
        summary: {
          totalStudents,
          filteredStudents: searchResult.total,
          executionTimeMs
        }
      });

    } catch (error) {
      // Handle any errors during search execution
      return Failure(error instanceof Error ? error : new Error('An unexpected error occurred during student search'));
    }
  }

  /**
   * Validates the search request parameters
   * 
   * @param request - The request to validate
   * @throws Error if validation fails
   */
  private validateRequest(request: SearchStudentsRequest): void {
    if (!request.searchCriteria) {
      throw new Error('Search criteria is required');
    }

    if (!request.searchCriteria.tenantId?.trim()) {
      throw new Error('Tenant ID is required');
    }

    if (!request.requestedBy?.trim()) {
      throw new Error('Requested by user ID is required');
    }

    // Validate pagination parameters
    const { page, limit } = request.searchCriteria;
    
    if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
      throw new Error('Page must be a positive integer starting from 1');
    }

    if (limit !== undefined && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
      throw new Error('Limit must be a positive integer between 1 and 100');
    }

    // Validate age range if provided
    if (request.searchCriteria.ageRange) {
      const { min, max } = request.searchCriteria.ageRange;
      
      if (min < 0 || max < 0 || min > max) {
        throw new Error('Invalid age range: min and max must be non-negative and min must be less than or equal to max');
      }
    }

    // Validate enrollment year if provided
    if (request.searchCriteria.enrollmentYear !== undefined) {
      const currentYear = new Date().getFullYear();
      if (request.searchCriteria.enrollmentYear < 1900 || request.searchCriteria.enrollmentYear > currentYear + 1) {
        throw new Error('Enrollment year must be between 1900 and next year');
      }
    }

    // Validate graduation year if provided
    if (request.searchCriteria.graduationYear !== undefined) {
      const currentYear = new Date().getFullYear();
      if (request.searchCriteria.graduationYear < 1900 || request.searchCriteria.graduationYear > currentYear + 10) {
        throw new Error('Graduation year must be between 1900 and 10 years from now');
      }
    }
  }

  /**
   * Normalizes and applies default values to search criteria
   * 
   * @param criteria - The raw search criteria from the request
   * @returns Normalized search criteria with defaults applied
   */
  private normalizeSearchCriteria(criteria: StudentSearchDto): StudentSearchDto {
    return {
      ...criteria,
      // Apply default pagination values
      page: criteria.page || 1,
      limit: Math.min(criteria.limit || 20, 100), // Cap at 100 items per page
      // Apply default sorting
      sortBy: criteria.sortBy || 'lastName',
      sortOrder: criteria.sortOrder || 'asc',
      // Trim string values
      firstName: criteria.firstName?.trim(),
      lastName: criteria.lastName?.trim(),
      status: criteria.status?.trim(),
      grade: criteria.grade?.trim(),
    };
  }

  /**
   * Converts DTO search criteria to domain search criteria
   * 
   * @param criteria - The normalized DTO search criteria
   * @returns Domain search criteria object
   */
  private mapToDomainCriteria(criteria: StudentSearchDto): StudentSearchCriteria {
    return {
      firstName: criteria.firstName,
      lastName: criteria.lastName,
      status: criteria.status as any, // Cast to domain status type
      enrollmentYear: criteria.enrollmentYear,
      graduationYear: criteria.graduationYear,
      ageRange: criteria.ageRange,
      grade: criteria.grade,
      hasAllergies: criteria.hasAllergies,
      hasMedicalConditions: criteria.hasMedicalConditions,
    };
  }

  /**
   * Calculates the offset for pagination based on page and limit
   * 
   * @param page - The page number (1-based)
   * @param limit - The number of items per page
   * @returns The offset for the database query (0-based)
   */
  private calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Gets the total number of students in the tenant for summary statistics
   * 
   * @param tenantId - The tenant ID
   * @returns Promise resolving to the total student count
   */
  private async getTotalStudentCount(tenantId: string): Promise<number> {
    try {
      // Use an empty search to get total count
      const totalResult = await this.studentRepository.searchStudents(
        {},
        tenantId,
        1, // We only need the count, not the data
        0
      );
      return totalResult.total;
    } catch (error) {
      // If we can't get the total count, return 0 to avoid breaking the search
      console.warn('Failed to get total student count:', error);
      return 0;
    }
  }
}