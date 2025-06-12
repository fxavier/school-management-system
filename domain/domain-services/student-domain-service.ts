import { 
  ValidationError, 
  BusinessRuleViolationError, 
  DuplicateEntityError, 
  Email,
  calculateAge 
} from '../../shared';
import { Student } from '../entities/student';
import { StudentNumber } from '../value-objects/student-number';
import { GuardianInfo } from '../value-objects/guardian-info';
import { StudentRepository } from '../repositories/student-repository';

export class StudentDomainService {
  constructor(private readonly studentRepository: StudentRepository) {}

  public async validateUniqueStudentNumber(
    studentNumber: StudentNumber,
    tenantId: string
  ): Promise<void> {
    const isUnique = await this.studentRepository.isStudentNumberUnique(studentNumber, tenantId);
    if (!isUnique) {
      throw new DuplicateEntityError('Student', 'studentNumber', studentNumber.value, tenantId);
    }
  }

  public async validateUniqueEmail(
    email: Email,
    tenantId: string,
    excludeStudentId?: string
  ): Promise<void> {
    const isUnique = await this.studentRepository.isEmailUnique(email.value, tenantId, excludeStudentId);
    if (!isUnique) {
      throw new DuplicateEntityError('Student', 'email', email.value, tenantId);
    }
  }

  public async validateUniqueNationalId(
    nationalId: string,
    tenantId: string,
    excludeStudentId?: string
  ): Promise<void> {
    const isUnique = await this.studentRepository.isNationalIdUnique(nationalId, tenantId, excludeStudentId);
    if (!isUnique) {
      throw new DuplicateEntityError('Student', 'nationalId', nationalId, tenantId);
    }
  }

  public validateEnrollmentEligibility(
    dateOfBirth: Date,
    enrollmentDate: Date
  ): void {
    const ageAtEnrollment = this.calculateAgeAtDate(dateOfBirth, enrollmentDate);
    
    if (ageAtEnrollment < 3) {
      throw new BusinessRuleViolationError(
        'MinimumEnrollmentAge',
        'Student must be at least 3 years old at enrollment',
        { ageAtEnrollment, minimumAge: 3 }
      );
    }

    if (ageAtEnrollment > 25) {
      throw new BusinessRuleViolationError(
        'MaximumEnrollmentAge',
        'Student cannot be older than 25 years at enrollment',
        { ageAtEnrollment, maximumAge: 25 }
      );
    }
  }

  public validateGuardianRequirements(guardians: GuardianInfo[]): void {
    if (!guardians || guardians.length === 0) {
      throw new ValidationError('guardians', guardians, 'At least one guardian is required');
    }

    if (guardians.length > 5) {
      throw new ValidationError('guardians', guardians, 'Maximum of 5 guardians allowed');
    }

    const primaryContacts = guardians.filter(g => g.isPrimaryContact);
    if (primaryContacts.length !== 1) {
      throw new BusinessRuleViolationError(
        'PrimaryContactRequirement',
        'Exactly one guardian must be designated as primary contact',
        { primaryContactCount: primaryContacts.length }
      );
    }

    const emergencyContacts = guardians.filter(g => g.isEmergencyContact);
    if (emergencyContacts.length === 0) {
      throw new BusinessRuleViolationError(
        'EmergencyContactRequirement',
        'At least one guardian must be designated as emergency contact',
        { emergencyContactCount: emergencyContacts.length }
      );
    }

    // Check for duplicate emails
    const emails = guardians.map(g => g.email.value);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      throw new ValidationError('guardians', guardians, 'Guardian emails must be unique');
    }

    // Check for duplicate phone numbers
    const phones = guardians.map(g => g.phoneNumber.value);
    const uniquePhones = new Set(phones);
    if (phones.length !== uniquePhones.size) {
      throw new ValidationError('guardians', guardians, 'Guardian phone numbers must be unique');
    }
  }

  public validateGraduationEligibility(student: Student): void {
    if (!student.isActive) {
      throw new BusinessRuleViolationError(
        'GraduationEligibility',
        'Only active students can graduate',
        { currentStatus: student.status }
      );
    }

    const enrollmentDuration = Date.now() - student.enrollmentDate.getTime();
    const minimumEnrollmentDays = 365; // Minimum 1 year enrollment
    const enrollmentDays = enrollmentDuration / (1000 * 60 * 60 * 24);

    if (enrollmentDays < minimumEnrollmentDays) {
      throw new BusinessRuleViolationError(
        'MinimumEnrollmentPeriod',
        'Student must be enrolled for at least 1 year before graduation',
        { 
          enrollmentDays: Math.floor(enrollmentDays),
          minimumEnrollmentDays 
        }
      );
    }
  }

  public validateTransferEligibility(student: Student): void {
    if (student.isGraduated) {
      throw new BusinessRuleViolationError(
        'TransferEligibility',
        'Graduated students cannot be transferred',
        { currentStatus: student.status }
      );
    }
  }

  public validateReactivationEligibility(student: Student): void {
    if (student.isGraduated) {
      throw new BusinessRuleViolationError(
        'ReactivationEligibility',
        'Graduated students cannot be reactivated',
        { currentStatus: student.status }
      );
    }

    if (student.isActive) {
      throw new BusinessRuleViolationError(
        'ReactivationEligibility',
        'Student is already active',
        { currentStatus: student.status }
      );
    }
  }

  public async validateBulkEnrollment(
    students: Student[],
    tenantId: string
  ): Promise<{ valid: Student[]; invalid: { student: Student; errors: string[] }[] }> {
    const valid: Student[] = [];
    const invalid: { student: Student; errors: string[] }[] = [];

    const studentNumbers = new Set<string>();
    const emails = new Set<string>();
    const nationalIds = new Set<string>();

    for (const student of students) {
      const errors: string[] = [];

      // Check for duplicates within the batch
      if (studentNumbers.has(student.studentNumber.value)) {
        errors.push(`Duplicate student number in batch: ${student.studentNumber.value}`);
      } else {
        studentNumbers.add(student.studentNumber.value);
      }

      if (student.email && emails.has(student.email.value)) {
        errors.push(`Duplicate email in batch: ${student.email.value}`);
      } else if (student.email) {
        emails.add(student.email.value);
      }

      if (student.nationalId && nationalIds.has(student.nationalId)) {
        errors.push(`Duplicate national ID in batch: ${student.nationalId}`);
      } else if (student.nationalId) {
        nationalIds.add(student.nationalId);
      }

      // Check database uniqueness
      try {
        await this.validateUniqueStudentNumber(student.studentNumber, tenantId);
      } catch (error) {
        if (error instanceof DuplicateEntityError) {
          errors.push(`Student number already exists: ${student.studentNumber.value}`);
        }
      }

      if (student.email) {
        try {
          await this.validateUniqueEmail(student.email, tenantId);
        } catch (error) {
          if (error instanceof DuplicateEntityError) {
            errors.push(`Email already exists: ${student.email.value}`);
          }
        }
      }

      if (student.nationalId) {
        try {
          await this.validateUniqueNationalId(student.nationalId, tenantId);
        } catch (error) {
          if (error instanceof DuplicateEntityError) {
            errors.push(`National ID already exists: ${student.nationalId}`);
          }
        }
      }

      // Validate business rules
      try {
        this.validateEnrollmentEligibility(student.dateOfBirth, student.enrollmentDate);
        this.validateGuardianRequirements(student.guardians);
      } catch (error) {
        if (error instanceof BusinessRuleViolationError || error instanceof ValidationError) {
          errors.push(error.message);
        }
      }

      if (errors.length === 0) {
        valid.push(student);
      } else {
        invalid.push({ student, errors });
      }
    }

    return { valid, invalid };
  }

  public calculateGradeLevel(student: Student, academicYearStart: Date): string {
    const age = this.calculateAgeAtDate(student.dateOfBirth, academicYearStart);
    
    if (age < 5) return 'Pre-K';
    if (age < 6) return 'Kindergarten';
    if (age < 7) return '1st Grade';
    if (age < 8) return '2nd Grade';
    if (age < 9) return '3rd Grade';
    if (age < 10) return '4th Grade';
    if (age < 11) return '5th Grade';
    if (age < 12) return '6th Grade';
    if (age < 13) return '7th Grade';
    if (age < 14) return '8th Grade';
    if (age < 15) return '9th Grade';
    if (age < 16) return '10th Grade';
    if (age < 17) return '11th Grade';
    if (age < 18) return '12th Grade';
    
    return 'Post-Secondary';
  }

  private calculateAgeAtDate(birthDate: Date, targetDate: Date): number {
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = targetDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}