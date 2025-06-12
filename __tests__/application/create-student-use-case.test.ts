/**
 * Create Student Use Case Tests
 * 
 * These tests verify the behavior of the CreateStudentUseCase, including
 * successful creation scenarios, validation errors, and business rule enforcement.
 * The tests use mocks to isolate the use case from infrastructure dependencies.
 */

import { CreateStudentUseCase, CreateStudentRequest } from '../../application/use-cases/student/create-student-use-case';
import { StudentRepository } from '../../domain/repositories/student-repository';
import { StudentDomainService } from '../../domain/domain-services/student-domain-service';
import { DomainEventPublisher } from '../../application/ports/domain-event-publisher';
import { CreateStudentDto } from '../../application/dto/student-dto';
import { Student } from '../../domain/entities/student';
import { DuplicateEntityError } from '../../shared';

// Mock implementations
class MockStudentRepository implements Partial<StudentRepository> {
  private students: Student[] = [];

  async save(student: Student): Promise<void> {
    this.students.push(student);
  }

  async findById(id: string, tenantId: string): Promise<Student | null> {
    return this.students.find(s => s.id === id && s.tenantId === tenantId) || null;
  }

  async isStudentNumberUnique(studentNumber: any, tenantId: string): Promise<boolean> {
    return !this.students.some(s => s.studentNumber.value === studentNumber.value && s.tenantId === tenantId);
  }

  async isEmailUnique(email: string, tenantId: string): Promise<boolean> {
    return !this.students.some(s => s.email?.value === email && s.tenantId === tenantId);
  }

  async isNationalIdUnique(nationalId: string, tenantId: string): Promise<boolean> {
    return !this.students.some(s => s.nationalId === nationalId && s.tenantId === tenantId);
  }
}

class MockStudentDomainService extends StudentDomainService {
  constructor(repository: StudentRepository) {
    super(repository);
  }
}

class MockDomainEventPublisher implements DomainEventPublisher {
  private publishedEvents: any[] = [];

  async publish(event: any): Promise<any> {
    this.publishedEvents.push(event);
    return {
      success: true,
      eventId: 'test-event-id',
      publishedAt: new Date()
    };
  }

  // Implement other required methods with basic implementations
  async publishBatch(): Promise<any> { return { totalEvents: 0, successCount: 0, failureCount: 0, results: [], processingTimeMs: 0 }; }
  async publishAndWait(): Promise<any> { return { success: true, eventId: 'test', publishedAt: new Date(), acknowledgments: [] }; }
  async scheduleEvent(): Promise<any> { return { success: true, eventId: 'test', publishedAt: new Date(), scheduledFor: new Date() }; }
  async cancelScheduledEvent(): Promise<any> { return { success: true }; }
  async healthCheck(): Promise<any> { return { healthy: true, pendingEvents: 0, errorRate: 0 }; }
  async getStatistics(): Promise<any> { return { eventsPublished: 0, successRate: 100, averageLatencyMs: 0, errorCount: 0, throughputPerSecond: 0 }; }
  async getFailedEvents(): Promise<any> { return { events: [], total: 0 }; }
  async retryFailedEvents(): Promise<any> { return { totalEvents: 0, successCount: 0, failureCount: 0, results: [], processingTimeMs: 0 }; }
  async start(): Promise<void> { }
  async stop(): Promise<void> { }

  getPublishedEvents() {
    return this.publishedEvents;
  }
}

describe('CreateStudentUseCase', () => {
  let useCase: CreateStudentUseCase;
  let mockRepository: MockStudentRepository;
  let mockDomainService: MockStudentDomainService;
  let mockEventPublisher: MockDomainEventPublisher;

  const createValidStudentData = (): CreateStudentDto => ({
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '2010-05-15',
    gender: 'male',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'State',
      zipCode: '12345',
      country: 'US'
    },
    guardians: [{
      firstName: 'Jane',
      lastName: 'Doe',
      relationship: 'parent',
      email: 'jane.doe@example.com',
      phoneNumber: '+1987654321',
      isEmergencyContact: true,
      isPrimaryContact: true
    }],
    nationalId: 'NAT123456',
    tenantId: 'tenant-123'
  });

  beforeEach(() => {
    mockRepository = new MockStudentRepository();
    mockDomainService = new MockStudentDomainService(mockRepository as any);
    mockEventPublisher = new MockDomainEventPublisher();
    
    useCase = new CreateStudentUseCase(
      mockRepository as any,
      mockDomainService,
      mockEventPublisher
    );
  });

  describe('Successful Student Creation', () => {
    it('should successfully create a new student with valid data', async () => {
      // Arrange
      const studentData = createValidStudentData();
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.student).toBeDefined();
        expect(result.value.student.firstName).toBe('John');
        expect(result.value.student.lastName).toBe('Doe');
        expect(result.value.student.fullName).toBe('John Doe');
        expect(result.value.student.isActive).toBe(true);
        expect(result.value.student.guardians).toHaveLength(1);
        expect(result.value.student.primaryGuardian.fullName).toBe('Jane Doe');
        expect(result.value.message).toContain('successfully enrolled');
      }
    });

    it('should generate a unique student number', async () => {
      // Arrange
      const studentData = createValidStudentData();
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.student.studentNumber).toMatch(/^STU\d{6}$/);
      }
    });

    it('should publish a StudentEnrolled domain event', async () => {
      // Arrange
      const studentData = createValidStudentData();
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      const publishedEvents = mockEventPublisher.getPublishedEvents();
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0].eventType).toBe('student.enrolled');
    });
  });

  describe('Validation Errors', () => {
    it('should fail when first name is missing', async () => {
      // Arrange
      const studentData = createValidStudentData();
      studentData.firstName = '';
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('First name is required');
      }
    });

    it('should fail when no guardians are provided', async () => {
      // Arrange
      const studentData = createValidStudentData();
      studentData.guardians = [];
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('At least one guardian is required');
      }
    });

    it('should fail when multiple guardians are marked as primary contact', async () => {
      // Arrange
      const studentData = createValidStudentData();
      studentData.guardians.push({
        firstName: 'Bob',
        lastName: 'Doe',
        relationship: 'parent',
        email: 'bob.doe@example.com',
        phoneNumber: '+1555666777',
        isEmergencyContact: true,
        isPrimaryContact: true // This creates a conflict
      });
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('Exactly one guardian must be designated as primary contact');
      }
    });

    it('should fail when student is too young', async () => {
      // Arrange
      const studentData = createValidStudentData();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      studentData.dateOfBirth = twoYearsAgo.toISOString().split('T')[0];
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('must be at least 3 years old');
      }
    });

    it('should fail when email format is invalid', async () => {
      // Arrange
      const studentData = createValidStudentData();
      studentData.email = 'invalid-email-format';
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('Invalid email format');
      }
    });
  });

  describe('Business Rule Enforcement', () => {
    it('should handle duplicate email error from domain service', async () => {
      // Arrange
      const studentData = createValidStudentData();
      
      // Mock the domain service to throw duplicate email error
      jest.spyOn(mockDomainService, 'validateUniqueEmail')
        .mockRejectedValue(new DuplicateEntityError('Student', 'email', studentData.email!, 'tenant-123'));

      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error).toBeInstanceOf(DuplicateEntityError);
      }
    });

    it('should create student without optional email and phone', async () => {
      // Arrange
      const studentData = createValidStudentData();
      delete studentData.email;
      delete studentData.phoneNumber;
      const request: CreateStudentRequest = {
        studentData,
        performedBy: 'admin-user-123'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.student.email).toBeUndefined();
        expect(result.value.student.phoneNumber).toBeUndefined();
      }
    });
  });

  describe('Audit Trail', () => {
    it('should set audit information correctly', async () => {
      // Arrange
      const studentData = createValidStudentData();
      const performedBy = 'admin-user-123';
      const request: CreateStudentRequest = {
        studentData,
        performedBy
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.student.createdBy).toBe(performedBy);
        expect(result.value.student.updatedBy).toBe(performedBy);
        expect(result.value.student.createdAt).toBeDefined();
        expect(result.value.student.updatedAt).toBeDefined();
        expect(result.value.student.tenantId).toBe('tenant-123');
      }
    });
  });
});