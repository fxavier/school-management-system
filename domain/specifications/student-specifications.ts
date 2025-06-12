import { Student } from '../entities/student';
import { calculateAge, STUDENT_STATUS } from '../../shared';

export interface Specification<T> {
  isSatisfiedBy(entity: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(entity: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity);
  }
}

class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity);
  }
}

class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return !this.spec.isSatisfiedBy(entity);
  }
}

// Student-specific specifications
export class ActiveStudentSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.status === STUDENT_STATUS.ACTIVE;
  }
}

export class GraduatedStudentSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.status === STUDENT_STATUS.GRADUATED;
  }
}

export class MinorStudentSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.age < 18;
  }
}

export class AdultStudentSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.age >= 18;
  }
}

export class StudentWithAllergiesSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.allergies.length > 0;
  }
}

export class StudentWithMedicalConditionsSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.medicalConditions.length > 0;
  }
}

export class StudentAgeRangeSpecification extends BaseSpecification<Student> {
  constructor(
    private minAge: number,
    private maxAge: number
  ) {
    super();
  }

  isSatisfiedBy(student: Student): boolean {
    const age = student.age;
    return age >= this.minAge && age <= this.maxAge;
  }
}

export class StudentEnrolledInYearSpecification extends BaseSpecification<Student> {
  constructor(private year: number) {
    super();
  }

  isSatisfiedBy(student: Student): boolean {
    return student.enrollmentDate.getFullYear() === this.year;
  }
}

export class StudentGraduatedInYearSpecification extends BaseSpecification<Student> {
  constructor(private year: number) {
    super();
  }

  isSatisfiedBy(student: Student): boolean {
    return student.graduationDate?.getFullYear() === this.year;
  }
}

export class StudentWithEmergencyContactSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.emergencyContacts.length > 0;
  }
}

export class LongTermStudentSpecification extends BaseSpecification<Student> {
  constructor(private minimumYears: number = 2) {
    super();
  }

  isSatisfiedBy(student: Student): boolean {
    const enrollmentTime = Date.now() - student.enrollmentDate.getTime();
    const enrollmentYears = enrollmentTime / (1000 * 60 * 60 * 24 * 365);
    return enrollmentYears >= this.minimumYears;
  }
}

export class StudentEligibleForGraduationSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    // Must be active
    if (!student.isActive) {
      return false;
    }

    // Must be enrolled for at least 1 year
    const enrollmentTime = Date.now() - student.enrollmentDate.getTime();
    const enrollmentDays = enrollmentTime / (1000 * 60 * 60 * 24);
    if (enrollmentDays < 365) {
      return false;
    }

    // Must be at least 16 years old (typical minimum graduation age)
    if (student.age < 16) {
      return false;
    }

    return true;
  }
}

export class StudentRequiresParentalConsentSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.age < 18;
  }
}

export class StudentWithValidContactInfoSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    // Must have at least one emergency contact
    if (student.emergencyContacts.length === 0) {
      return false;
    }

    // Must have a primary guardian contact
    const primaryGuardian = student.primaryGuardian;
    if (!primaryGuardian) {
      return false;
    }

    // Primary guardian must have valid email and phone
    return (
      primaryGuardian.email &&
      primaryGuardian.phoneNumber &&
      primaryGuardian.email.value.trim() !== '' &&
      primaryGuardian.phoneNumber.value.trim() !== ''
    );
  }
}

export class StudentBirthdayThisMonthSpecification extends BaseSpecification<Student> {
  constructor(private targetMonth?: number) {
    super();
    // If no month provided, use current month
    this.targetMonth = targetMonth ?? new Date().getMonth();
  }

  isSatisfiedBy(student: Student): boolean {
    return student.dateOfBirth.getMonth() === this.targetMonth;
  }
}

export class StudentNeedsDocumentationUpdateSpecification extends BaseSpecification<Student> {
  constructor(private maxDaysSinceUpdate: number = 365) {
    super();
  }

  isSatisfiedBy(student: Student): boolean {
    const daysSinceUpdate = (Date.now() - student.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > this.maxDaysSinceUpdate;
  }
}

// Composite specifications for common business scenarios
export class EligibleForAdvancementSpecification extends BaseSpecification<Student> {
  constructor() {
    super();
  }

  isSatisfiedBy(student: Student): boolean {
    const activeSpec = new ActiveStudentSpecification();
    const validContactSpec = new StudentWithValidContactInfoSpecification();
    const longTermSpec = new LongTermStudentSpecification(1);

    return activeSpec.and(validContactSpec).and(longTermSpec).isSatisfiedBy(student);
  }
}

export class RequiresSpecialAttentionSpecification extends BaseSpecification<Student> {
  isSatisfiedBy(student: Student): boolean {
    const hasAllergies = new StudentWithAllergiesSpecification();
    const hasMedicalConditions = new StudentWithMedicalConditionsSpecification();
    const isMinor = new MinorStudentSpecification();
    const needsDocumentUpdate = new StudentNeedsDocumentationUpdateSpecification(180);

    return hasAllergies
      .or(hasMedicalConditions)
      .or(isMinor.and(needsDocumentUpdate))
      .isSatisfiedBy(student);
  }
}