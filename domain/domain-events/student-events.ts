import { DomainEvent, generateId, EVENT_TYPES } from '../../shared';
import { Student } from '../entities/student';
import { StudentNumber } from '../value-objects/student-number';

export class StudentEnrolledEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly tenantId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly eventData: Record<string, any>;

  constructor(student: Student) {
    this.eventId = generateId();
    this.eventType = EVENT_TYPES.STUDENT_ENROLLED;
    this.aggregateId = student.id;
    this.aggregateType = 'Student';
    this.tenantId = student.tenantId;
    this.occurredOn = new Date();
    this.version = student.version;
    this.eventData = {
      studentNumber: student.studentNumber.value,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth.toISOString(),
      age: student.age,
      gender: student.gender,
      enrollmentDate: student.enrollmentDate.toISOString(),
      primaryGuardian: {
        fullName: student.primaryGuardian.fullName,
        email: student.primaryGuardian.email.value,
        phoneNumber: student.primaryGuardian.phoneNumber.value,
        relationship: student.primaryGuardian.relationship,
      },
      address: {
        street: student.address.street,
        city: student.address.city,
        state: student.address.state,
        zipCode: student.address.zipCode,
        country: student.address.country,
      },
    };
  }
}

export class StudentUpdatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly tenantId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly eventData: Record<string, any>;

  constructor(student: Student, updatedFields: string[]) {
    this.eventId = generateId();
    this.eventType = EVENT_TYPES.STUDENT_UPDATED;
    this.aggregateId = student.id;
    this.aggregateType = 'Student';
    this.tenantId = student.tenantId;
    this.occurredOn = new Date();
    this.version = student.version;
    this.eventData = {
      studentNumber: student.studentNumber.value,
      fullName: student.fullName,
      updatedFields,
      currentStatus: student.status,
    };
  }
}

export class StudentGraduatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly tenantId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly eventData: Record<string, any>;

  constructor(student: Student) {
    this.eventId = generateId();
    this.eventType = EVENT_TYPES.STUDENT_GRADUATED;
    this.aggregateId = student.id;
    this.aggregateType = 'Student';
    this.tenantId = student.tenantId;
    this.occurredOn = new Date();
    this.version = student.version;
    this.eventData = {
      studentNumber: student.studentNumber.value,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: student.fullName,
      enrollmentDate: student.enrollmentDate.toISOString(),
      graduationDate: student.graduationDate?.toISOString(),
      yearsEnrolled: student.graduationDate 
        ? Math.floor((student.graduationDate.getTime() - student.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
        : undefined,
      primaryGuardian: {
        fullName: student.primaryGuardian.fullName,
        email: student.primaryGuardian.email.value,
        phoneNumber: student.primaryGuardian.phoneNumber.value,
      },
    };
  }
}

export class StudentTransferredEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly tenantId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly eventData: Record<string, any>;

  constructor(student: Student, reason: string) {
    this.eventId = generateId();
    this.eventType = EVENT_TYPES.STUDENT_TRANSFERRED;
    this.aggregateId = student.id;
    this.aggregateType = 'Student';
    this.tenantId = student.tenantId;
    this.occurredOn = new Date();
    this.version = student.version;
    this.eventData = {
      studentNumber: student.studentNumber.value,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: student.fullName,
      enrollmentDate: student.enrollmentDate.toISOString(),
      transferDate: new Date().toISOString(),
      reason,
      primaryGuardian: {
        fullName: student.primaryGuardian.fullName,
        email: student.primaryGuardian.email.value,
        phoneNumber: student.primaryGuardian.phoneNumber.value,
      },
    };
  }
}

export class StudentSuspendedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly tenantId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly eventData: Record<string, any>;

  constructor(student: Student, reason: string) {
    this.eventId = generateId();
    this.eventType = 'student.suspended';
    this.aggregateId = student.id;
    this.aggregateType = 'Student';
    this.tenantId = student.tenantId;
    this.occurredOn = new Date();
    this.version = student.version;
    this.eventData = {
      studentNumber: student.studentNumber.value,
      fullName: student.fullName,
      suspensionDate: new Date().toISOString(),
      reason,
      primaryGuardian: {
        fullName: student.primaryGuardian.fullName,
        email: student.primaryGuardian.email.value,
        phoneNumber: student.primaryGuardian.phoneNumber.value,
      },
    };
  }
}

export class StudentReactivatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly tenantId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly eventData: Record<string, any>;

  constructor(student: Student) {
    this.eventId = generateId();
    this.eventType = 'student.reactivated';
    this.aggregateId = student.id;
    this.aggregateType = 'Student';
    this.tenantId = student.tenantId;
    this.occurredOn = new Date();
    this.version = student.version;
    this.eventData = {
      studentNumber: student.studentNumber.value,
      fullName: student.fullName,
      reactivationDate: new Date().toISOString(),
      primaryGuardian: {
        fullName: student.primaryGuardian.fullName,
        email: student.primaryGuardian.email.value,
        phoneNumber: student.primaryGuardian.phoneNumber.value,
      },
    };
  }
}

export class StudentContactUpdatedEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly tenantId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly eventData: Record<string, any>;

  constructor(student: Student, contactType: 'email' | 'phone' | 'address' | 'guardian') {
    this.eventId = generateId();
    this.eventType = 'student.contact_updated';
    this.aggregateId = student.id;
    this.aggregateType = 'Student';
    this.tenantId = student.tenantId;
    this.occurredOn = new Date();
    this.version = student.version;
    this.eventData = {
      studentNumber: student.studentNumber.value,
      fullName: student.fullName,
      contactType,
      updatedDate: new Date().toISOString(),
    };
  }
}