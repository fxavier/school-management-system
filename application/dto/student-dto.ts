/**
 * Data Transfer Objects (DTOs) for Student-related operations
 * 
 * DTOs are used to transfer data between the application layer and external layers
 * (presentation, infrastructure). They provide a stable interface that doesn't
 * expose internal domain object structure and can be optimized for specific use cases.
 * 
 * Key principles:
 * - DTOs are simple data containers without business logic
 * - They can be serialized/deserialized for API communication
 * - They may contain derived/computed fields for presentation
 * - They protect domain objects from being directly exposed
 */

/**
 * DTO representing guardian information for external communication
 * Used when transferring guardian data to/from the API
 */
export interface GuardianDto {
  /** Guardian's first name */
  firstName: string;
  /** Guardian's last name */
  lastName: string;
  /** Guardian's full name (computed field) */
  fullName: string;
  /** Relationship to the student (parent, stepparent, grandparent, etc.) */
  relationship: string;
  /** Guardian's email address */
  email: string;
  /** Guardian's phone number */
  phoneNumber: string;
  /** Guardian's address (optional) */
  address?: AddressDto;
  /** Whether this guardian is an emergency contact */
  isEmergencyContact: boolean;
  /** Whether this guardian is the primary contact */
  isPrimaryContact: boolean;
}

/**
 * DTO representing address information
 * Used for both student and guardian addresses
 */
export interface AddressDto {
  /** Street address including number and street name */
  street: string;
  /** City name */
  city: string;
  /** State or province */
  state: string;
  /** ZIP or postal code */
  zipCode: string;
  /** Country (defaults to 'US') */
  country: string;
  /** Full formatted address (computed field) */
  fullAddress: string;
}

/**
 * Complete Student DTO with all information
 * Used for detailed student views and full data transfer
 */
export interface StudentDto {
  /** Unique student identifier */
  id: string;
  /** Student number in format STU123456 */
  studentNumber: string;
  /** Student's first name */
  firstName: string;
  /** Student's last name */
  lastName: string;
  /** Student's full name (computed field) */
  fullName: string;
  /** Date of birth in ISO string format */
  dateOfBirth: string;
  /** Calculated age in years (computed field) */
  age: number;
  /** Gender identity */
  gender: 'male' | 'female' | 'other';
  /** Email address (optional) */
  email?: string;
  /** Phone number (optional) */
  phoneNumber?: string;
  /** Home address */
  address: AddressDto;
  /** List of guardians */
  guardians: GuardianDto[];
  /** Primary guardian (computed field) */
  primaryGuardian: GuardianDto;
  /** Emergency contacts (computed field) */
  emergencyContacts: GuardianDto[];
  /** Current enrollment status */
  status: string;
  /** Enrollment date in ISO string format */
  enrollmentDate: string;
  /** Graduation date in ISO string format (optional) */
  graduationDate?: string;
  /** National ID number (optional) */
  nationalId?: string;
  /** Blood type (optional) */
  bloodType?: string;
  /** List of allergies (optional) */
  allergies: string[];
  /** List of medical conditions (optional) */
  medicalConditions: string[];
  /** General notes (optional) */
  notes?: string;
  /** Whether the student is currently active (computed field) */
  isActive: boolean;
  /** Whether the student has graduated (computed field) */
  isGraduated: boolean;
  /** Record creation timestamp */
  createdAt: string;
  /** Record last update timestamp */
  updatedAt: string;
  /** ID of user who created the record */
  createdBy?: string;
  /** ID of user who last updated the record */
  updatedBy?: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
}

/**
 * Simplified Student DTO for list views and summaries
 * Contains only essential information to optimize performance
 */
export interface StudentSummaryDto {
  /** Unique student identifier */
  id: string;
  /** Student number */
  studentNumber: string;
  /** Student's full name */
  fullName: string;
  /** Calculated age */
  age: number;
  /** Gender */
  gender: 'male' | 'female' | 'other';
  /** Current status */
  status: string;
  /** Primary guardian name */
  primaryGuardianName: string;
  /** Primary guardian phone */
  primaryGuardianPhone: string;
  /** Enrollment date */
  enrollmentDate: string;
  /** Whether student has medical conditions */
  hasMedicalConditions: boolean;
  /** Whether student has allergies */
  hasAllergies: boolean;
}

/**
 * DTO for creating a new student
 * Contains all required fields and optional fields for student creation
 */
export interface CreateStudentDto {
  /** Student's first name */
  firstName: string;
  /** Student's last name */
  lastName: string;
  /** Date of birth in ISO string format */
  dateOfBirth: string;
  /** Gender identity */
  gender: 'male' | 'female' | 'other';
  /** Email address (optional) */
  email?: string;
  /** Phone number (optional) */
  phoneNumber?: string;
  /** Home address */
  address: CreateAddressDto;
  /** List of guardians (at least one required) */
  guardians: CreateGuardianDto[];
  /** National ID number (optional) */
  nationalId?: string;
  /** Blood type (optional) */
  bloodType?: string;
  /** List of allergies (optional) */
  allergies?: string[];
  /** List of medical conditions (optional) */
  medicalConditions?: string[];
  /** General notes (optional) */
  notes?: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
}

/**
 * DTO for creating guardian information
 */
export interface CreateGuardianDto {
  /** Guardian's first name */
  firstName: string;
  /** Guardian's last name */
  lastName: string;
  /** Relationship to student */
  relationship: string;
  /** Guardian's email address */
  email: string;
  /** Guardian's phone number */
  phoneNumber: string;
  /** Guardian's address (optional) */
  address?: CreateAddressDto;
  /** Whether this guardian is an emergency contact */
  isEmergencyContact: boolean;
  /** Whether this guardian is the primary contact */
  isPrimaryContact: boolean;
}

/**
 * DTO for creating address information
 */
export interface CreateAddressDto {
  /** Street address */
  street: string;
  /** City name */
  city: string;
  /** State or province */
  state: string;
  /** ZIP or postal code */
  zipCode: string;
  /** Country (defaults to 'US') */
  country?: string;
}

/**
 * DTO for updating student information
 * All fields are optional to support partial updates
 */
export interface UpdateStudentDto {
  /** Student's first name */
  firstName?: string;
  /** Student's last name */
  lastName?: string;
  /** Email address */
  email?: string;
  /** Phone number */
  phoneNumber?: string;
  /** Home address */
  address?: CreateAddressDto;
  /** National ID number */
  nationalId?: string;
  /** Blood type */
  bloodType?: string;
  /** List of allergies */
  allergies?: string[];
  /** List of medical conditions */
  medicalConditions?: string[];
  /** General notes */
  notes?: string;
}

/**
 * DTO for student search and filtering
 * Supports various search criteria for finding students
 */
export interface StudentSearchDto {
  /** Search by first name (partial match) */
  firstName?: string;
  /** Search by last name (partial match) */
  lastName?: string;
  /** Filter by status */
  status?: string;
  /** Filter by enrollment year */
  enrollmentYear?: number;
  /** Filter by graduation year */
  graduationYear?: number;
  /** Filter by age range */
  ageRange?: {
    min: number;
    max: number;
  };
  /** Filter by grade level */
  grade?: string;
  /** Filter students with allergies */
  hasAllergies?: boolean;
  /** Filter students with medical conditions */
  hasMedicalConditions?: boolean;
  /** Pagination - page number (starts from 1) */
  page?: number;
  /** Pagination - items per page */
  limit?: number;
  /** Sorting field */
  sortBy?: 'firstName' | 'lastName' | 'age' | 'enrollmentDate' | 'studentNumber';
  /** Sorting direction */
  sortOrder?: 'asc' | 'desc';
  /** Tenant ID for multi-tenancy */
  tenantId: string;
}

/**
 * DTO for paginated student search results
 */
export interface StudentSearchResultDto {
  /** Array of matching students */
  students: StudentSummaryDto[];
  /** Total number of students matching the criteria */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages after this one */
  hasNextPage: boolean;
  /** Whether there are pages before this one */
  hasPreviousPage: boolean;
}

/**
 * DTO for student status change operations
 */
export interface ChangeStudentStatusDto {
  /** Student ID */
  studentId: string;
  /** New status */
  newStatus: string;
  /** Reason for status change */
  reason?: string;
  /** Date of status change (defaults to current date) */
  effectiveDate?: string;
  /** Tenant ID */
  tenantId: string;
}

/**
 * DTO for graduation operation
 */
export interface GraduateStudentDto {
  /** Student ID */
  studentId: string;
  /** Graduation date */
  graduationDate: string;
  /** Tenant ID */
  tenantId: string;
}

/**
 * DTO for bulk operations result
 */
export interface BulkOperationResultDto<T> {
  /** Successfully processed items */
  successful: T[];
  /** Failed items with error details */
  failed: {
    item: T;
    errors: string[];
  }[];
  /** Total number of items processed */
  totalProcessed: number;
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
}