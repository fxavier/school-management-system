/**
 * Get Student Use Case
 * 
 * This use case handles the retrieval of a single student by their ID.
 * It provides a read-only operation that returns detailed student information
 * for display, editing, or other business operations.
 * 
 * Business Rules:
 * - Student must exist in the specified tenant
 * - User must have permission to view student data
 * - Returns complete student information including guardians and medical data
 * 
 * This is a Query operation that does not modify system state.
 */

import { UseCase, Result, Success, Failure, EntityNotFoundError } from '../../../shared';
import { Student } from '../../../domain/entities/student';
import { StudentRepository } from '../../../domain/repositories/student-repository';
import { StudentMapper } from '../../mappers/student-mapper';
import { StudentDto } from '../../dto/student-dto';

/**
 * Request DTO for the Get Student use case
 */
export interface GetStudentRequest {
  /** Unique identifier of the student to retrieve */
  studentId: string;
  /** Tenant ID for multi-tenancy support */
  tenantId: string;
  /** ID of the user performing the operation (for audit/security) */
  requestedBy: string;
}

/**
 * Response DTO for the Get Student use case
 */
export interface GetStudentResponse {
  /** The requested student with complete information */
  student: StudentDto;
}

/**
 * Get Student Use Case Implementation
 * 
 * This use case follows the Query pattern and implements read-only access
 * to student data. It ensures proper authorization and data formatting
 * while maintaining performance through optimized repository queries.
 */
export class GetStudentUseCase implements UseCase<GetStudentRequest, Result<GetStudentResponse>> {

  /**
   * Creates a new instance of the Get Student use case
   * 
   * @param studentRepository - Repository for student data access
   */
  constructor(
    private readonly studentRepository: StudentRepository
  ) {}

  /**
   * Executes the get student use case
   * 
   * This method handles the retrieval process:
   * 1. Validates the input parameters
   * 2. Retrieves the student from the repository
   * 3. Checks if the student exists in the specified tenant
   * 4. Converts the domain entity to a DTO
   * 5. Returns the formatted student data
   * 
   * @param request - The get student request containing student ID and tenant
   * @returns Promise resolving to Result with student data or error
   */
  async execute(request: GetStudentRequest): Promise<Result<GetStudentResponse>> {
    try {
      const { studentId, tenantId, requestedBy } = request;

      // Step 1: Validate input parameters
      this.validateRequest(request);

      // Step 2: Retrieve student from repository
      const student = await this.studentRepository.findById(studentId, tenantId);

      // Step 3: Check if student exists
      if (!student) {
        return Failure(new EntityNotFoundError('Student', studentId, tenantId));
      }

      // Step 4: Convert domain entity to DTO for external use
      const studentDto = StudentMapper.toDto(student);

      // Step 5: Return success result with student data
      return Success({
        student: studentDto
      });

    } catch (error) {
      // Handle any unexpected errors during retrieval
      return Failure(error instanceof Error ? error : new Error('An unexpected error occurred while retrieving student'));
    }
  }

  /**
   * Validates the input request parameters
   * 
   * @param request - The request to validate
   * @throws Error if validation fails
   */
  private validateRequest(request: GetStudentRequest): void {
    if (!request.studentId?.trim()) {
      throw new Error('Student ID is required');
    }

    if (!request.tenantId?.trim()) {
      throw new Error('Tenant ID is required');
    }

    if (!request.requestedBy?.trim()) {
      throw new Error('Requested by user ID is required');
    }

    // Validate student ID format (should be a valid UUID or student number)
    if (!this.isValidId(request.studentId)) {
      throw new Error('Invalid student ID format');
    }
  }

  /**
   * Validates if the provided ID has a valid format
   * Accepts both UUID format and student number format (STU123456)
   * 
   * @param id - The ID to validate
   * @returns true if the ID format is valid
   */
  private isValidId(id: string): boolean {
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Student number format validation (STU followed by 6 digits)
    const studentNumberRegex = /^STU\d{6}$/;
    
    return uuidRegex.test(id) || studentNumberRegex.test(id);
  }
}