/**
 * Graduate Student Use Case
 * 
 * This use case handles the graduation of students from the school system.
 * It enforces business rules around graduation eligibility and updates
 * the student's status while maintaining proper audit trails.
 * 
 * Business Rules Enforced:
 * - Student must exist in the specified tenant
 * - Student must be in active status to graduate
 * - Student must be enrolled for at least 1 year
 * - Student must be at least 16 years old
 * - Graduation date cannot be before enrollment date
 * - Graduation date cannot be in the future
 * 
 * This is a Command operation that modifies system state.
 */

import { UseCase, Result, Success, Failure, EntityNotFoundError } from '../../../shared';
import { Student } from '../../../domain/entities/student';
import { StudentRepository } from '../../../domain/repositories/student-repository';
import { StudentDomainService } from '../../../domain/domain-services/student-domain-service';
import { StudentGraduatedEvent } from '../../../domain/domain-events/student-events';
import { StudentMapper } from '../../mappers/student-mapper';
import { GraduateStudentDto, StudentDto } from '../../dto/student-dto';
import { DomainEventPublisher } from '../../ports/domain-event-publisher';

/**
 * Request DTO for the Graduate Student use case
 */
export interface GraduateStudentRequest {
  /** Graduation data including student ID and graduation date */
  graduationData: GraduateStudentDto;
  /** ID of the user performing the operation */
  performedBy: string;
}

/**
 * Response DTO for the Graduate Student use case
 */
export interface GraduateStudentResponse {
  /** The graduated student with updated information */
  student: StudentDto;
  /** Graduation summary information */
  graduationSummary: {
    /** Number of years the student was enrolled */
    yearsEnrolled: number;
    /** Academic year of graduation */
    academicYear: string;
    /** Age at graduation */
    ageAtGraduation: number;
  };
  /** Success message */
  message: string;
}

/**
 * Graduate Student Use Case Implementation
 * 
 * This use case handles the complex business process of graduating a student.
 * It validates eligibility, updates the student status, and triggers
 * appropriate notifications and reporting processes.
 */
export class GraduateStudentUseCase implements UseCase<GraduateStudentRequest, Result<GraduateStudentResponse>> {

  /**
   * Creates a new instance of the Graduate Student use case
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
   * Executes the graduate student use case
   * 
   * This method orchestrates the graduation process:
   * 1. Validates input parameters
   * 2. Retrieves the student to be graduated
   * 3. Validates graduation eligibility
   * 4. Applies the graduation to the student entity
   * 5. Persists the updated student
   * 6. Publishes the StudentGraduated domain event
   * 7. Returns graduation confirmation with summary
   * 
   * @param request - The graduation request containing student ID and date
   * @returns Promise resolving to Result with graduation confirmation or error
   */
  async execute(request: GraduateStudentRequest): Promise<Result<GraduateStudentResponse>> {
    try {
      const { graduationData, performedBy } = request;

      // Step 1: Validate input parameters
      this.validateRequest(request);

      // Step 2: Retrieve the student to be graduated
      const student = await this.studentRepository.findById(
        graduationData.studentId, 
        graduationData.tenantId
      );

      if (!student) {
        return Failure(new EntityNotFoundError(
          'Student', 
          graduationData.studentId, 
          graduationData.tenantId
        ));
      }

      // Step 3: Validate graduation eligibility using domain service
      this.studentDomainService.validateGraduationEligibility(student);

      // Step 4: Validate graduation date
      const graduationDate = new Date(graduationData.graduationDate);
      this.validateGraduationDate(graduationDate, student);

      // Step 5: Calculate graduation summary information
      const graduationSummary = this.calculateGraduationSummary(student, graduationDate);

      // Step 6: Apply graduation to the student entity
      student.graduate(graduationDate);

      // Step 7: Update audit information
      (student as any).updatedBy = performedBy;
      (student as any).updatedAt = new Date();

      // Step 8: Persist the updated student
      await this.studentRepository.save(student);

      // Step 9: Publish domain event for integration with other systems
      const graduatedEvent = new StudentGraduatedEvent(student);
      await this.eventPublisher.publish(graduatedEvent);

      // Step 10: Convert updated entity to DTO
      const studentDto = StudentMapper.toDto(student);

      // Step 11: Return success result with graduation confirmation
      return Success({
        student: studentDto,
        graduationSummary,
        message: `${student.fullName} has been successfully graduated on ${graduationDate.toLocaleDateString()}`
      });

    } catch (error) {
      // Handle and wrap any errors that occurred during graduation
      return Failure(error instanceof Error ? error : new Error('An unexpected error occurred during student graduation'));
    }
  }

  /**
   * Validates the graduation request parameters
   * 
   * @param request - The request to validate
   * @throws Error if validation fails
   */
  private validateRequest(request: GraduateStudentRequest): void {
    if (!request.graduationData) {
      throw new Error('Graduation data is required');
    }

    if (!request.graduationData.studentId?.trim()) {
      throw new Error('Student ID is required');
    }

    if (!request.graduationData.tenantId?.trim()) {
      throw new Error('Tenant ID is required');
    }

    if (!request.graduationData.graduationDate) {
      throw new Error('Graduation date is required');
    }

    if (!request.performedBy?.trim()) {
      throw new Error('Performed by user ID is required');
    }

    // Validate graduation date format
    const graduationDate = new Date(request.graduationData.graduationDate);
    if (isNaN(graduationDate.getTime())) {
      throw new Error('Invalid graduation date format');
    }
  }

  /**
   * Validates the graduation date against business rules
   * 
   * @param graduationDate - The proposed graduation date
   * @param student - The student being graduated
   * @throws Error if graduation date is invalid
   */
  private validateGraduationDate(graduationDate: Date, student: Student): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Graduation date cannot be in the future
    if (graduationDate > today) {
      throw new Error('Graduation date cannot be in the future');
    }

    // Graduation date must be after enrollment date
    if (graduationDate <= student.enrollmentDate) {
      throw new Error('Graduation date must be after enrollment date');
    }

    // Graduation date cannot be more than 100 years ago (sanity check)
    const oneHundredYearsAgo = new Date();
    oneHundredYearsAgo.setFullYear(oneHundredYearsAgo.getFullYear() - 100);
    if (graduationDate < oneHundredYearsAgo) {
      throw new Error('Graduation date cannot be more than 100 years ago');
    }

    // Student must be enrolled for at least 1 year
    const enrollmentDuration = graduationDate.getTime() - student.enrollmentDate.getTime();
    const minimumEnrollmentDays = 365;
    const enrollmentDays = enrollmentDuration / (1000 * 60 * 60 * 24);

    if (enrollmentDays < minimumEnrollmentDays) {
      throw new Error(`Student must be enrolled for at least 1 year. Current enrollment: ${Math.floor(enrollmentDays)} days`);
    }

    // Calculate age at graduation
    const ageAtGraduation = this.calculateAgeAtDate(student.dateOfBirth, graduationDate);
    if (ageAtGraduation < 16) {
      throw new Error(`Student must be at least 16 years old to graduate. Age at graduation would be: ${ageAtGraduation}`);
    }
  }

  /**
   * Calculates graduation summary information
   * 
   * @param student - The student being graduated
   * @param graduationDate - The graduation date
   * @returns Graduation summary with calculated fields
   */
  private calculateGraduationSummary(student: Student, graduationDate: Date): {
    yearsEnrolled: number;
    academicYear: string;
    ageAtGraduation: number;
  } {
    // Calculate years enrolled (with decimal precision)
    const enrollmentDuration = graduationDate.getTime() - student.enrollmentDate.getTime();
    const yearsEnrolled = Number((enrollmentDuration / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));

    // Determine academic year based on graduation date
    // Academic year typically runs from August/September to May/June
    const academicYear = this.getAcademicYear(graduationDate);

    // Calculate age at graduation
    const ageAtGraduation = this.calculateAgeAtDate(student.dateOfBirth, graduationDate);

    return {
      yearsEnrolled,
      academicYear,
      ageAtGraduation
    };
  }

  /**
   * Determines the academic year for a given graduation date
   * 
   * @param graduationDate - The graduation date
   * @returns Academic year string (e.g., \"2023-2024\")
   */
  private getAcademicYear(graduationDate: Date): string {
    const year = graduationDate.getFullYear();
    const month = graduationDate.getMonth(); // 0-based

    // If graduation is between August (7) and December (11), 
    // it's the first part of the academic year
    if (month >= 7) {
      return `${year}-${year + 1}`;
    } else {
      // If graduation is between January (0) and July (6),
      // it's the second part of the academic year
      return `${year - 1}-${year}`;
    }
  }

  /**
   * Calculates age at a specific date
   * 
   * @param birthDate - The person's birth date
   * @param targetDate - The date to calculate age at
   * @returns Age in complete years
   */
  private calculateAgeAtDate(birthDate: Date, targetDate: Date): number {
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = targetDate.getMonth() - birthDate.getMonth();
    
    // Subtract a year if the birthday hasn't occurred yet in the target year
    if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}