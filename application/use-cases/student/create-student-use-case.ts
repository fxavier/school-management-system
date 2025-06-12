/**
 * Create Student Use Case
 * 
 * This use case handles the enrollment of new students into the school system.
 * It orchestrates the validation, domain object creation, and persistence of student data
 * while enforcing all business rules and maintaining data consistency.
 * 
 * Business Rules Enforced:
 * - Student must be between 3-25 years old
 * - Student number must be unique within the tenant
 * - At least one guardian is required
 * - Exactly one guardian must be primary contact
 * - At least one guardian must be emergency contact
 * - Email addresses must be unique if provided
 * - National ID must be unique if provided
 * 
 * This is a Command operation that modifies system state.
 */

import { UseCase, Result, Success, Failure } from '../../../shared';
import { Student } from '../../../domain/entities/student';
import { StudentRepository } from '../../../domain/repositories/student-repository';
import { StudentDomainService } from '../../../domain/domain-services/student-domain-service';
import { StudentEnrolledEvent } from '../../../domain/domain-events/student-events';
import { StudentMapper } from '../../mappers/student-mapper';
import { CreateStudentDto, StudentDto } from '../../dto/student-dto';
import { DomainEventPublisher } from '../../ports/domain-event-publisher';

/**
 * Request DTO for the Create Student use case
 */
export interface CreateStudentRequest {
  /** Student data from the client */
  studentData: CreateStudentDto;
  /** ID of the user performing the operation */
  performedBy: string;
}

/**
 * Response DTO for the Create Student use case
 */
export interface CreateStudentResponse {
  /** The created student as DTO */
  student: StudentDto;
  /** Success message */
  message: string;
}

/**
 * Create Student Use Case Implementation
 * 
 * Follows the Command pattern and Clean Architecture principles.
 * Coordinates between domain services, repositories, and event publishing
 * while maintaining clear separation of concerns.
 */
export class CreateStudentUseCase implements UseCase<CreateStudentRequest, Result<CreateStudentResponse>> {
  
  /**
   * Creates a new instance of the Create Student use case
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
   * Executes the create student use case
   * 
   * This method orchestrates the entire student creation process:
   * 1. Validates input data and business rules
   * 2. Checks uniqueness constraints
   * 3. Creates the student domain entity
   * 4. Persists the student to the repository
   * 5. Publishes the StudentEnrolled domain event
   * 6. Returns the created student as DTO
   * 
   * @param request - The create student request containing student data
   * @returns Promise resolving to Result with success or failure
   */
  async execute(request: CreateStudentRequest): Promise<Result<CreateStudentResponse>> {
    try {
      const { studentData, performedBy } = request;

      // Step 1: Validate input data format and basic business rules
      await this.validateInputData(studentData);

      // Step 2: Convert DTO to domain-compatible props
      const studentProps = StudentMapper.createDtoToProps(studentData);

      // Step 3: Validate domain business rules using domain service
      await this.validateBusinessRules(studentProps);

      // Step 4: Create the student domain entity
      const student = Student.create(studentProps);

      // Step 5: Set audit information
      (student as any).createdBy = performedBy;
      (student as any).updatedBy = performedBy;

      // Step 6: Persist the student to the repository
      await this.studentRepository.save(student);

      // Step 7: Publish domain event for integration with other bounded contexts
      const enrolledEvent = new StudentEnrolledEvent(student);
      await this.eventPublisher.publish(enrolledEvent);

      // Step 8: Convert domain entity to response DTO
      const studentDto = StudentMapper.toDto(student);

      // Step 9: Return success result
      return Success({
        student: studentDto,
        message: `Student ${student.fullName} has been successfully enrolled with student number ${student.studentNumber.value}`
      });

    } catch (error) {
      // Handle and wrap any errors that occurred during the process
      return Failure(error instanceof Error ? error : new Error('An unexpected error occurred during student creation'));
    }
  }

  /**
   * Validates the input data format and basic requirements
   * This includes DTO-level validation before domain object creation
   * 
   * @param studentData - The student data to validate
   * @throws Error if validation fails
   */
  private async validateInputData(studentData: CreateStudentDto): Promise<void> {
    // Validate required fields
    if (!studentData.firstName?.trim()) {
      throw new Error('First name is required');
    }

    if (!studentData.lastName?.trim()) {
      throw new Error('Last name is required');
    }

    if (!studentData.dateOfBirth) {
      throw new Error('Date of birth is required');
    }

    if (!studentData.gender) {
      throw new Error('Gender is required');
    }

    if (!studentData.address) {
      throw new Error('Address is required');
    }

    if (!studentData.tenantId?.trim()) {
      throw new Error('Tenant ID is required');
    }

    // Validate date of birth
    const dateOfBirth = new Date(studentData.dateOfBirth);
    if (isNaN(dateOfBirth.getTime())) {
      throw new Error('Invalid date of birth format');
    }

    // Validate age requirements
    StudentMapper.validateAgeRequirements(dateOfBirth);

    // Validate guardian requirements
    StudentMapper.validateGuardianRequirements(studentData);

    // Validate email format if provided
    if (studentData.email && !this.isValidEmail(studentData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone number format if provided
    if (studentData.phoneNumber && !this.isValidPhoneNumber(studentData.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }
  }

  /**
   * Validates domain-specific business rules using the domain service
   * 
   * @param studentProps - The student properties to validate
   * @throws Error if business rules are violated
   */
  private async validateBusinessRules(studentProps: any): Promise<void> {
    // Validate enrollment eligibility
    this.studentDomainService.validateEnrollmentEligibility(
      studentProps.dateOfBirth,
      studentProps.enrollmentDate
    );

    // Validate guardian requirements
    this.studentDomainService.validateGuardianRequirements(studentProps.guardians);

    // Check uniqueness constraints
    await this.studentDomainService.validateUniqueStudentNumber(
      studentProps.studentNumber,
      studentProps.tenantId
    );

    if (studentProps.email) {
      await this.studentDomainService.validateUniqueEmail(
        studentProps.email,
        studentProps.tenantId
      );
    }

    if (studentProps.nationalId) {
      await this.studentDomainService.validateUniqueNationalId(
        studentProps.nationalId,
        studentProps.tenantId
      );
    }
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