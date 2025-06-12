import { 
  AggregateRoot, 
  Email, 
  PhoneNumber, 
  Address, 
  ValidationError,
  STUDENT_STATUS,
  StudentStatus,
  calculateAge 
} from '../../shared';
import { StudentNumber } from '../value-objects/student-number';
import { GuardianInfo } from '../value-objects/guardian-info';

/**
 * Properties interface for creating a Student entity
 * Contains all the required and optional data needed to construct a Student
 * Used in factory methods and for type safety when creating students
 */
export interface StudentProps {
  /** Unique student identifier in the format STU123456 */
  studentNumber: StudentNumber;
  /** Student's first name */
  firstName: string;
  /** Student's last name */
  lastName: string;
  /** Student's date of birth */
  dateOfBirth: Date;
  /** Student's gender identity */
  gender: 'male' | 'female' | 'other';
  /** Student's email address (optional) */
  email?: Email;
  /** Student's phone number (optional) */
  phoneNumber?: PhoneNumber;
  /** Student's home address */
  address: Address;
  /** List of guardians/parents responsible for the student */
  guardians: GuardianInfo[];
  /** Current enrollment status */
  status: StudentStatus;
  /** Date when the student was enrolled */
  enrollmentDate: Date;
  /** Date when the student graduated (optional) */
  graduationDate?: Date;
  /** Government-issued national ID number (optional) */
  nationalId?: string;
  /** Blood type for medical purposes (optional) */
  bloodType?: string;
  /** List of known allergies (optional) */
  allergies?: string[];
  /** List of medical conditions (optional) */
  medicalConditions?: string[];
  /** General notes about the student (optional) */
  notes?: string;
  /** Tenant ID for multi-tenancy support */
  tenantId: string;
}

/**
 * Student Entity - Aggregate Root
 * 
 * Represents a student in the school management system.
 * This is an aggregate root, meaning it's the main entry point for all student-related operations.
 * It encapsulates business rules around student enrollment, status changes, and data management.
 * 
 * Key Business Rules:
 * - Students must have at least one guardian
 * - Exactly one guardian must be designated as primary contact
 * - Students must be between 3-25 years old at enrollment
 * - Student numbers must be unique within a tenant
 * - Only active students can graduate
 * - Graduated students cannot be modified
 */
export class Student implements AggregateRoot {
  /** Unique identifier for the student (inherited from Entity) */
  public readonly id: string;
  /** Timestamp when the student record was created */
  public readonly createdAt: Date;
  /** Timestamp when the student record was last updated */
  public readonly updatedAt: Date;
  /** ID of the user who created this student record */
  public readonly createdBy?: string;
  /** ID of the user who last updated this student record */
  public readonly updatedBy?: string;
  /** Version number for optimistic locking */
  public readonly version: number;
  /** Tenant ID for multi-tenancy support */
  public readonly tenantId: string;

  /**
   * Private constructor to enforce use of factory methods
   * This ensures that all students are created through controlled methods
   * that can apply business rules and validation
   */
  private constructor(
    id: string,
    private _studentNumber: StudentNumber,
    private _firstName: string,
    private _lastName: string,
    private _dateOfBirth: Date,
    private _gender: 'male' | 'female' | 'other',
    private _address: Address,
    private _guardians: GuardianInfo[],
    private _status: StudentStatus,
    private _enrollmentDate: Date,
    tenantId: string,
    private _email?: Email,
    private _phoneNumber?: PhoneNumber,
    private _graduationDate?: Date,
    private _nationalId?: string,
    private _bloodType?: string,
    private _allergies?: string[],
    private _medicalConditions?: string[],
    private _notes?: string,
    createdAt?: Date,
    updatedAt?: Date,
    createdBy?: string,
    updatedBy?: string,
    version: number = 1
  ) {
    this.id = id;
    this.tenantId = tenantId;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.version = version;

    this.validate();
  }

  private validate(): void {
    if (!this._firstName?.trim()) {
      throw new ValidationError('firstName', this._firstName, 'First name is required');
    }

    if (!this._lastName?.trim()) {
      throw new ValidationError('lastName', this._lastName, 'Last name is required');
    }

    if (this._firstName.length < 2 || this._firstName.length > 50) {
      throw new ValidationError('firstName', this._firstName, 'First name must be between 2 and 50 characters');
    }

    if (this._lastName.length < 2 || this._lastName.length > 50) {
      throw new ValidationError('lastName', this._lastName, 'Last name must be between 2 and 50 characters');
    }

    if (!this._dateOfBirth) {
      throw new ValidationError('dateOfBirth', this._dateOfBirth, 'Date of birth is required');
    }

    if (this._dateOfBirth > new Date()) {
      throw new ValidationError('dateOfBirth', this._dateOfBirth, 'Date of birth cannot be in the future');
    }

    const age = calculateAge(this._dateOfBirth);
    if (age < 3 || age > 25) {
      throw new ValidationError('dateOfBirth', this._dateOfBirth, 'Student age must be between 3 and 25 years');
    }

    if (!this._guardians || this._guardians.length === 0) {
      throw new ValidationError('guardians', this._guardians, 'At least one guardian is required');
    }

    const primaryContacts = this._guardians.filter(g => g.isPrimaryContact);
    if (primaryContacts.length !== 1) {
      throw new ValidationError('guardians', this._guardians, 'Exactly one guardian must be designated as primary contact');
    }

    if (!this._enrollmentDate) {
      throw new ValidationError('enrollmentDate', this._enrollmentDate, 'Enrollment date is required');
    }

    if (this._enrollmentDate > new Date()) {
      throw new ValidationError('enrollmentDate', this._enrollmentDate, 'Enrollment date cannot be in the future');
    }

    if (this._graduationDate && this._graduationDate <= this._enrollmentDate) {
      throw new ValidationError('graduationDate', this._graduationDate, 'Graduation date must be after enrollment date');
    }

    if (this._nationalId && this._nationalId.length < 5) {
      throw new ValidationError('nationalId', this._nationalId, 'National ID must be at least 5 characters');
    }
  }

  // Getters
  get studentNumber(): StudentNumber {
    return this._studentNumber;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  get dateOfBirth(): Date {
    return new Date(this._dateOfBirth);
  }

  get age(): number {
    return calculateAge(this._dateOfBirth);
  }

  get gender(): 'male' | 'female' | 'other' {
    return this._gender;
  }

  get email(): Email | undefined {
    return this._email;
  }

  get phoneNumber(): PhoneNumber | undefined {
    return this._phoneNumber;
  }

  get address(): Address {
    return this._address;
  }

  get guardians(): GuardianInfo[] {
    return [...this._guardians];
  }

  get primaryGuardian(): GuardianInfo {
    return this._guardians.find(g => g.isPrimaryContact)!;
  }

  get emergencyContacts(): GuardianInfo[] {
    return this._guardians.filter(g => g.isEmergencyContact);
  }

  get status(): StudentStatus {
    return this._status;
  }

  get enrollmentDate(): Date {
    return new Date(this._enrollmentDate);
  }

  get graduationDate(): Date | undefined {
    return this._graduationDate ? new Date(this._graduationDate) : undefined;
  }

  get nationalId(): string | undefined {
    return this._nationalId;
  }

  get bloodType(): string | undefined {
    return this._bloodType;
  }

  get allergies(): string[] {
    return this._allergies ? [...this._allergies] : [];
  }

  get medicalConditions(): string[] {
    return this._medicalConditions ? [...this._medicalConditions] : [];
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get isActive(): boolean {
    return this._status === STUDENT_STATUS.ACTIVE;
  }

  get isGraduated(): boolean {
    return this._status === STUDENT_STATUS.GRADUATED;
  }

  // Business Methods
  public updatePersonalInfo(
    firstName: string,
    lastName: string,
    email?: Email,
    phoneNumber?: PhoneNumber
  ): void {
    this._firstName = firstName;
    this._lastName = lastName;
    this._email = email;
    this._phoneNumber = phoneNumber;
    this.validate();
  }

  public updateAddress(address: Address): void {
    this._address = address;
  }

  public addGuardian(guardian: GuardianInfo): void {
    if (guardian.isPrimaryContact) {
      // Remove primary status from existing guardians
      this._guardians = this._guardians.map(g => 
        new GuardianInfo(
          g.firstName,
          g.lastName,
          g.relationship,
          g.email,
          g.phoneNumber,
          g.isEmergencyContact,
          false, // Remove primary status
          g.address
        )
      );
    }
    
    this._guardians.push(guardian);
    this.validate();
  }

  public removeGuardian(guardianEmail: Email): void {
    const guardianToRemove = this._guardians.find(g => g.email.equals(guardianEmail));
    if (!guardianToRemove) {
      throw new ValidationError('guardian', guardianEmail.value, 'Guardian not found');
    }

    if (guardianToRemove.isPrimaryContact && this._guardians.length === 1) {
      throw new ValidationError('guardian', guardianEmail.value, 'Cannot remove the only guardian');
    }

    this._guardians = this._guardians.filter(g => !g.email.equals(guardianEmail));
    this.validate();
  }

  public suspend(reason: string): void {
    if (this._status === STUDENT_STATUS.GRADUATED) {
      throw new ValidationError('status', this._status, 'Cannot suspend a graduated student');
    }
    
    this._status = STUDENT_STATUS.SUSPENDED;
    this._notes = this._notes ? `${this._notes}\nSuspended: ${reason}` : `Suspended: ${reason}`;
  }

  public reactivate(): void {
    if (this._status === STUDENT_STATUS.GRADUATED) {
      throw new ValidationError('status', this._status, 'Cannot reactivate a graduated student');
    }
    
    this._status = STUDENT_STATUS.ACTIVE;
  }

  public graduate(graduationDate: Date): void {
    if (this._status !== STUDENT_STATUS.ACTIVE) {
      throw new ValidationError('status', this._status, 'Only active students can graduate');
    }
    
    if (graduationDate <= this._enrollmentDate) {
      throw new ValidationError('graduationDate', graduationDate, 'Graduation date must be after enrollment date');
    }
    
    this._status = STUDENT_STATUS.GRADUATED;
    this._graduationDate = graduationDate;
  }

  public transfer(reason: string): void {
    if (this._status === STUDENT_STATUS.GRADUATED) {
      throw new ValidationError('status', this._status, 'Cannot transfer a graduated student');
    }
    
    this._status = STUDENT_STATUS.TRANSFERRED;
    this._notes = this._notes ? `${this._notes}\nTransferred: ${reason}` : `Transferred: ${reason}`;
  }

  public updateMedicalInfo(
    bloodType?: string,
    allergies?: string[],
    medicalConditions?: string[]
  ): void {
    this._bloodType = bloodType;
    this._allergies = allergies;
    this._medicalConditions = medicalConditions;
  }

  public addNote(note: string): void {
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${note}`;
    this._notes = this._notes ? `${this._notes}\n${newNote}` : newNote;
  }

  // Factory Methods
  public static create(props: StudentProps): Student {
    const id = props.studentNumber.value; // Use student number as ID
    
    return new Student(
      id,
      props.studentNumber,
      props.firstName,
      props.lastName,
      props.dateOfBirth,
      props.gender,
      props.address,
      props.guardians,
      props.status,
      props.enrollmentDate,
      props.tenantId,
      props.email,
      props.phoneNumber,
      props.graduationDate,
      props.nationalId,
      props.bloodType,
      props.allergies,
      props.medicalConditions,
      props.notes
    );
  }

  public static fromPersistence(
    id: string,
    props: StudentProps,
    createdAt: Date,
    updatedAt: Date,
    createdBy?: string,
    updatedBy?: string,
    version: number = 1
  ): Student {
    return new Student(
      id,
      props.studentNumber,
      props.firstName,
      props.lastName,
      props.dateOfBirth,
      props.gender,
      props.address,
      props.guardians,
      props.status,
      props.enrollmentDate,
      props.tenantId,
      props.email,
      props.phoneNumber,
      props.graduationDate,
      props.nationalId,
      props.bloodType,
      props.allergies,
      props.medicalConditions,
      props.notes,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
      version
    );
  }
}