import { Repository, STUDENT_STATUS, StudentStatus } from '../../shared';
import { Student } from '../entities/student';
import { StudentNumber } from '../value-objects/student-number';

export interface StudentSearchCriteria {
  firstName?: string;
  lastName?: string;
  status?: StudentStatus;
  enrollmentYear?: number;
  graduationYear?: number;
  ageRange?: {
    min: number;
    max: number;
  };
  grade?: string;
  hasAllergies?: boolean;
  hasMedicalConditions?: boolean;
}

export interface StudentRepository extends Repository<Student, string> {
  // Basic CRUD operations inherited from Repository<Student, string>
  
  // Student-specific queries
  findByStudentNumber(studentNumber: StudentNumber, tenantId: string): Promise<Student | null>;
  
  findByEmail(email: string, tenantId: string): Promise<Student | null>;
  
  findByNationalId(nationalId: string, tenantId: string): Promise<Student | null>;
  
  findActiveStudents(tenantId: string): Promise<Student[]>;
  
  findStudentsByStatus(status: StudentStatus, tenantId: string): Promise<Student[]>;
  
  findStudentsByGrade(grade: string, tenantId: string): Promise<Student[]>;
  
  findStudentsEnrolledInYear(year: number, tenantId: string): Promise<Student[]>;
  
  findStudentsGraduatedInYear(year: number, tenantId: string): Promise<Student[]>;
  
  searchStudents(
    criteria: StudentSearchCriteria,
    tenantId: string,
    limit?: number,
    offset?: number
  ): Promise<{
    students: Student[];
    total: number;
  }>;
  
  findStudentsWithBirthdays(
    startDate: Date,
    endDate: Date,
    tenantId: string
  ): Promise<Student[]>;
  
  findStudentsWithAllergies(tenantId: string): Promise<Student[]>;
  
  findStudentsWithMedicalConditions(tenantId: string): Promise<Student[]>;
  
  countStudentsByStatus(tenantId: string): Promise<Record<StudentStatus, number>>;
  
  countStudentsByGrade(tenantId: string): Promise<Record<string, number>>;
  
  getEnrollmentTrends(
    startDate: Date,
    endDate: Date,
    tenantId: string
  ): Promise<{
    date: Date;
    enrollments: number;
    graduations: number;
    transfers: number;
  }[]>;
  
  // Validation methods
  isStudentNumberUnique(studentNumber: StudentNumber, tenantId: string): Promise<boolean>;
  
  isEmailUnique(email: string, tenantId: string, excludeStudentId?: string): Promise<boolean>;
  
  isNationalIdUnique(nationalId: string, tenantId: string, excludeStudentId?: string): Promise<boolean>;
}