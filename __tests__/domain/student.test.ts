import { Student } from '../../domain/entities/student';
import { StudentNumber } from '../../domain/value-objects/student-number';
import { GuardianInfo } from '../../domain/value-objects/guardian-info';
import { Email, PhoneNumber, Address, STUDENT_STATUS } from '../../shared';

describe('Student Domain', () => {
  const createValidGuardian = (): GuardianInfo => {
    return new GuardianInfo(
      'John',
      'Doe',
      'parent',
      new Email('john.doe@example.com'),
      new PhoneNumber('+1234567890'),
      true, // isEmergencyContact
      true, // isPrimaryContact
      new Address('123 Main St', 'City', 'State', '12345', 'US')
    );
  };

  const createValidStudentProps = () => ({
    studentNumber: StudentNumber.generate(),
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: new Date('2010-05-15'),
    gender: 'female' as const,
    email: new Email('jane.smith@example.com'),
    phoneNumber: new PhoneNumber('+1987654321'),
    address: new Address('456 Oak Ave', 'City', 'State', '54321', 'US'),
    guardians: [createValidGuardian()],
    status: STUDENT_STATUS.ACTIVE,
    enrollmentDate: new Date('2020-09-01'),
    tenantId: 'tenant-123',
  });

  describe('StudentNumber', () => {
    it('should generate a valid student number', () => {
      const studentNumber = StudentNumber.generate();
      expect(studentNumber.value).toMatch(/^STU\d{6}$/);
    });

    it('should validate student number format', () => {
      expect(() => new StudentNumber('STU123456')).not.toThrow();
      expect(() => new StudentNumber('INVALID')).toThrow();
      expect(() => new StudentNumber('')).toThrow();
    });
  });

  describe('GuardianInfo', () => {
    it('should create a valid guardian', () => {
      const guardian = createValidGuardian();
      expect(guardian.fullName).toBe('John Doe');
      expect(guardian.relationship).toBe('parent');
      expect(guardian.isPrimaryContact).toBe(true);
      expect(guardian.isEmergencyContact).toBe(true);
    });

    it('should validate guardian relationship', () => {
      expect(() => new GuardianInfo(
        'John',
        'Doe',
        'invalid-relationship',
        new Email('john@example.com'),
        new PhoneNumber('+1234567890'),
        true,
        true
      )).toThrow();
    });
  });

  describe('Student Entity', () => {
    it('should create a valid student', () => {
      const props = createValidStudentProps();
      const student = Student.create(props);

      expect(student.firstName).toBe('Jane');
      expect(student.lastName).toBe('Smith');
      expect(student.fullName).toBe('Jane Smith');
      expect(student.isActive).toBe(true);
      expect(student.age).toBeGreaterThan(10);
      expect(student.guardians).toHaveLength(1);
      expect(student.primaryGuardian).toBeDefined();
    });

    it('should require at least one guardian', () => {
      const props = createValidStudentProps();
      props.guardians = [];

      expect(() => Student.create(props)).toThrow('At least one guardian is required');
    });

    it('should require exactly one primary contact', () => {
      const props = createValidStudentProps();
      const guardian1 = new GuardianInfo(
        'John',
        'Doe',
        'parent',
        new Email('john@example.com'),
        new PhoneNumber('+1234567890'),
        true,
        true // primary
      );
      const guardian2 = new GuardianInfo(
        'Jane',
        'Doe',
        'parent',
        new Email('jane@example.com'),
        new PhoneNumber('+1987654321'),
        true,
        true // also primary - should cause error
      );
      props.guardians = [guardian1, guardian2];

      expect(() => Student.create(props)).toThrow('Exactly one guardian must be designated as primary contact');
    });

    it('should allow student to graduate', () => {
      const props = createValidStudentProps();
      const student = Student.create(props);
      const graduationDate = new Date('2024-06-15');

      student.graduate(graduationDate);

      expect(student.isGraduated).toBe(true);
      expect(student.graduationDate).toEqual(graduationDate);
      expect(student.status).toBe(STUDENT_STATUS.GRADUATED);
    });

    it('should allow student to be suspended', () => {
      const props = createValidStudentProps();
      const student = Student.create(props);

      student.suspend('Academic misconduct');

      expect(student.status).toBe(STUDENT_STATUS.SUSPENDED);
      expect(student.notes).toContain('Suspended: Academic misconduct');
    });

    it('should allow student to be reactivated', () => {
      const props = createValidStudentProps();
      props.status = STUDENT_STATUS.SUSPENDED;
      const student = Student.create(props);

      student.reactivate();

      expect(student.isActive).toBe(true);
      expect(student.status).toBe(STUDENT_STATUS.ACTIVE);
    });

    it('should update personal information', () => {
      const props = createValidStudentProps();
      const student = Student.create(props);
      const newEmail = new Email('new.email@example.com');

      student.updatePersonalInfo('UpdatedFirst', 'UpdatedLast', newEmail);

      expect(student.firstName).toBe('UpdatedFirst');
      expect(student.lastName).toBe('UpdatedLast');
      expect(student.email?.value).toBe('new.email@example.com');
    });

    it('should add medical information', () => {
      const props = createValidStudentProps();
      const student = Student.create(props);

      student.updateMedicalInfo('O+', ['Peanuts', 'Shellfish'], ['Asthma']);

      expect(student.bloodType).toBe('O+');
      expect(student.allergies).toContain('Peanuts');
      expect(student.allergies).toContain('Shellfish');
      expect(student.medicalConditions).toContain('Asthma');
    });

    it('should add notes with timestamps', () => {
      const props = createValidStudentProps();
      const student = Student.create(props);

      student.addNote('Student shows great improvement in mathematics');

      expect(student.notes).toContain('Student shows great improvement in mathematics');
      expect(student.notes).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
    });
  });
});