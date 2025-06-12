/**
 * Update Student Use Case
 * 
 * This use case handles the modification of existing student information.
 * It supports partial updates and ensures all business rules are maintained
 * while preserving data integrity and audit trails.
 * 
 * Business Rules Enforced:
 * - Student must exist in the specified tenant
 * - Email must be unique if being updated
 * - National ID must be unique if being updated
 * - Graduated students cannot be modified
 * - Version checking for optimistic locking
 * 
 * This is a Command operation that modifies system state.
 */

import { UseCase, Result, Success, Failure, EntityNotFoundError, ConcurrencyError } from '../../../shared';
import { Student } from '../../../domain/entities/student';
import { StudentRepository } from '../../../domain/repositories/student-repository';
import { StudentDomainService } from '../../../domain/domain-services/student-domain-service';
import { StudentUpdatedEvent } from '../../../domain/domain-events/student-events';
import { StudentMapper } from '../../mappers/student-mapper';
import { UpdateStudentDto, StudentDto } from '../../dto/student-dto';
import { DomainEventPublisher } from '../../ports/domain-event-publisher';

/**
 * Request DTO for the Update Student use case
 */
export interface UpdateStudentRequest {
  /** Unique identifier of the student to update */
  studentId: string;
  /** Updated student data (partial) */
  updateData: UpdateStudentDto;
  /** Expected version for optimistic locking */
  expectedVersion: number;
  /** Tenant ID for multi-tenancy support */
  tenantId: string;
  /** ID of the user performing the operation */
  performedBy: string;
}

/**
 * Response DTO for the Update Student use case
 */
export interface UpdateStudentResponse {
  /** The updated student with complete information */
  student: StudentDto;
  /** List of fields that were actually changed */
  updatedFields: string[];
  /** Success message */
  message: string;
}

/**
 * Update Student Use Case Implementation
 * 
 * This use case handles student data modifications while ensuring business rules,
 * data consistency, and proper event handling. It supports partial updates and
 * implements optimistic locking to prevent concurrent modification conflicts.
 */
export class UpdateStudentUseCase implements UseCase<UpdateStudentRequest, Result<UpdateStudentResponse>> {

  /**
   * Creates a new instance of the Update Student use case
   * 
   * @param studentRepository - Repository for student persistence
   * @param studentDomainService - Domain service for business rule validation
   * @param eventPublisher - Service for publishing domain events
   */
  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly studentDomainService: StudentDomainService,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  /**
   * Executes the update student use case
   * 
   * This method orchestrates the student update process:
   * 1. Validates input parameters
   * 2. Retrieves the existing student
   * 3. Checks version for optimistic locking
   * 4. Validates business rules for the update
   * 5. Applies the changes to the student entity
   * 6. Persists the updated student
   * 7. Publishes the StudentUpdated domain event
   * 8. Returns the updated student data
   * 
   * @param request - The update student request containing changes
   * @returns Promise resolving to Result with updated student or error
   */
  async execute(request: UpdateStudentRequest): Promise<Result<UpdateStudentResponse>> {
    try {
      const { studentId, updateData, expectedVersion, tenantId, performedBy } = request;

      // Step 1: Validate input parameters
      this.validateRequest(request);

      // Step 2: Retrieve the existing student
      const existingStudent = await this.studentRepository.findById(studentId, tenantId);
      if (!existingStudent) {
        return Failure(new EntityNotFoundError('Student', studentId, tenantId));
      }

      // Step 3: Check version for optimistic locking
      if (existingStudent.version !== expectedVersion) {
        return Failure(new ConcurrencyError(
          'Student',
          studentId,
          expectedVersion,
          existingStudent.version
        ));
      }

      // Step 4: Check if student can be modified (business rule)
      if (existingStudent.isGraduated) {
        throw new Error('Graduated students cannot be modified');
      }

      // Step 5: Validate business rules for the update
      await this.validateBusinessRules(existingStudent, updateData, tenantId);

      // Step 6: Capture original state for change tracking
      const originalData = this.captureOriginalState(existingStudent);

      // Step 7: Apply the updates to the student entity
      StudentMapper.applyUpdateDto(existingStudent, updateData);

      // Step 8: Update audit information
      (existingStudent as any).updatedBy = performedBy;
      (existingStudent as any).updatedAt = new Date();

      // Step 9: Persist the updated student
      await this.studentRepository.save(existingStudent);

      // Step 10: Determine which fields were actually changed
      const updatedFields = this.getUpdatedFields(originalData, existingStudent, updateData);

      // Step 11: Publish domain event if there were actual changes
      if (updatedFields.length > 0) {
        const updatedEvent = new StudentUpdatedEvent(existingStudent, updatedFields);
        await this.eventPublisher.publish(updatedEvent);
      }

      // Step 12: Convert updated entity to DTO
      const studentDto = StudentMapper.toDto(existingStudent);

      // Step 13: Return success result
      return Success({
        student: studentDto,
        updatedFields,
        message: updatedFields.length > 0 
          ? `Student ${existingStudent.fullName} has been successfully updated`
          : `No changes were made to student ${existingStudent.fullName}`
      });

    } catch (error) {
      // Handle and wrap any errors that occurred during the update
      return Failure(error instanceof Error ? error : new Error('An unexpected error occurred during student update'));
    }
  }

  /**
   * Validates the update request parameters
   * 
   * @param request - The request to validate
   * @throws Error if validation fails
   */
  private validateRequest(request: UpdateStudentRequest): void {
    if (!request.studentId?.trim()) {
      throw new Error('Student ID is required');
    }

    if (!request.tenantId?.trim()) {
      throw new Error('Tenant ID is required');
    }

    if (!request.performedBy?.trim()) {
      throw new Error('Performed by user ID is required');
    }

    if (request.expectedVersion === undefined || request.expectedVersion < 1) {
      throw new Error('Expected version is required and must be a positive number');
    }

    if (!request.updateData || Object.keys(request.updateData).length === 0) {
      throw new Error('Update data is required and cannot be empty');
    }

    // Validate email format if being updated
    if (request.updateData.email && !this.isValidEmail(request.updateData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone number format if being updated
    if (request.updateData.phoneNumber && !this.isValidPhoneNumber(request.updateData.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Validate string lengths
    if (request.updateData.firstName && 
        (request.updateData.firstName.trim().length < 2 || request.updateData.firstName.trim().length > 50)) {
      throw new Error('First name must be between 2 and 50 characters');
    }

    if (request.updateData.lastName && 
        (request.updateData.lastName.trim().length < 2 || request.updateData.lastName.trim().length > 50)) {
      throw new Error('Last name must be between 2 and 50 characters');
    }
  }

  /**
   * Validates business rules for the update operation
   * 
   * @param student - The existing student entity
   * @param updateData - The data being updated
   * @param tenantId - The tenant ID
   * @throws Error if business rules are violated
   */
  private async validateBusinessRules(
    student: Student, 
    updateData: UpdateStudentDto, 
    tenantId: string
  ): Promise<void> {
    // Check email uniqueness if being updated
    if (updateData.email && updateData.email !== student.email?.value) {
      await this.studentDomainService.validateUniqueEmail(
        { value: updateData.email } as any,
        tenantId,
        student.id
      );
    }

    // Check national ID uniqueness if being updated
    if (updateData.nationalId && updateData.nationalId !== student.nationalId) {
      await this.studentDomainService.validateUniqueNationalId(
        updateData.nationalId,
        tenantId,
        student.id
      );
    }
  }

  /**
   * Captures the original state of the student for change tracking
   * 
   * @param student - The student entity
   * @returns Object containing original field values
   */
  private captureOriginalState(student: Student): Record<string, any> {
    return {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email?.value,
      phoneNumber: student.phoneNumber?.value,
      address: student.address.toString(),
      nationalId: student.nationalId,
      bloodType: student.bloodType,
      allergies: [...student.allergies],
      medicalConditions: [...student.medicalConditions],
      notes: student.notes,
    };
  }

  /**
   * Determines which fields were actually changed by comparing original and updated values
   * 
   * @param originalData - The original field values
   * @param updatedStudent - The updated student entity
   * @param updateData - The update data that was applied
   * @returns Array of field names that were changed
   */
  private getUpdatedFields(
    originalData: Record<string, any>,
    updatedStudent: Student,
    updateData: UpdateStudentDto
  ): string[] {
    const updatedFields: string[] = [];

    // Check each potentially updated field
    if (updateData.firstName && originalData.firstName !== updatedStudent.firstName) {
      updatedFields.push('firstName');
    }

    if (updateData.lastName && originalData.lastName !== updatedStudent.lastName) {
      updatedFields.push('lastName');
    }

    if (updateData.email && originalData.email !== updatedStudent.email?.value) {
      updatedFields.push('email');
    }

    if (updateData.phoneNumber && originalData.phoneNumber !== updatedStudent.phoneNumber?.value) {
      updatedFields.push('phoneNumber');
    }

    if (updateData.address && originalData.address !== updatedStudent.address.toString()) {
      updatedFields.push('address');
    }

    if (updateData.nationalId && originalData.nationalId !== updatedStudent.nationalId) {
      updatedFields.push('nationalId');
    }

    if (updateData.bloodType && originalData.bloodType !== updatedStudent.bloodType) {
      updatedFields.push('bloodType');
    }

    if (updateData.allergies && !this.arraysEqual(originalData.allergies, updatedStudent.allergies)) {
      updatedFields.push('allergies');
    }

    if (updateData.medicalConditions && !this.arraysEqual(originalData.medicalConditions, updatedStudent.medicalConditions)) {
      updatedFields.push('medicalConditions');
    }

    if (updateData.notes && originalData.notes !== updatedStudent.notes) {
      updatedFields.push('notes');
    }

    return updatedFields;
  }

  /**
   * Compares two arrays for equality
   * 
   * @param arr1 - First array
   * @param arr2 - Second array
   * @returns true if arrays contain the same elements in the same order
   */
  private arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((value, index) => value === arr2[index]);
  }

  /**
   * Basic email validation helper
   * 
   * @param email - Email to validate
   * @returns true if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Basic phone number validation helper
   * 
   * @param phone - Phone number to validate
   * @returns true if phone format is valid
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}