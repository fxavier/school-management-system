/**
 * Mappers for converting between Student domain objects and DTOs
 * 
 * Mappers provide a clean separation between the domain layer and external interfaces.
 * They handle the transformation of data structures while preserving business logic
 * encapsulation and enabling different representations for different use cases.
 * 
 * Key responsibilities:
 * - Convert domain objects to DTOs for external communication
 * - Convert DTOs to domain objects for processing
 * - Handle computed fields and data transformation
 * - Maintain type safety across layer boundaries
 */

import { Student, StudentProps } from '../../domain/entities/student';
import { StudentNumber } from '../../domain/value-objects/student-number';
import { GuardianInfo } from '../../domain/value-objects/guardian-info';
import { Email, PhoneNumber, Address, STUDENT_STATUS } from '../../shared';
import {
  StudentDto,
  StudentSummaryDto,
  GuardianDto,
  AddressDto,
  CreateStudentDto,
  CreateGuardianDto,
  CreateAddressDto,
  UpdateStudentDto,
  StudentSearchResultDto
} from '../dto/student-dto';

/**
 * Mapper class for Student-related transformations
 * Contains static methods for converting between domain objects and DTOs
 */
export class StudentMapper {
  
  /**
   * Converts a Student domain entity to a complete StudentDto
   * Includes all student information and computed fields
   * 
   * @param student - The Student domain entity
   * @returns Complete StudentDto with all fields populated
   */
  static toDto(student: Student): StudentDto {
    return {
      id: student.id,
      studentNumber: student.studentNumber.value,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth.toISOString(),
      age: student.age,
      gender: student.gender,
      email: student.email?.value,
      phoneNumber: student.phoneNumber?.value,
      address: this.addressToDto(student.address),
      guardians: student.guardians.map(guardian => this.guardianToDto(guardian)),
      primaryGuardian: this.guardianToDto(student.primaryGuardian),
      emergencyContacts: student.emergencyContacts.map(contact => this.guardianToDto(contact)),
      status: student.status,
      enrollmentDate: student.enrollmentDate.toISOString(),
      graduationDate: student.graduationDate?.toISOString(),
      nationalId: student.nationalId,
      bloodType: student.bloodType,
      allergies: student.allergies,
      medicalConditions: student.medicalConditions,
      notes: student.notes,
      isActive: student.isActive,
      isGraduated: student.isGraduated,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      createdBy: student.createdBy,
      updatedBy: student.updatedBy,
      tenantId: student.tenantId,
    };
  }

  /**
   * Converts a Student domain entity to a summary DTO for list views
   * Contains only essential information to optimize performance
   * 
   * @param student - The Student domain entity
   * @returns StudentSummaryDto with essential fields only
   */
  static toSummaryDto(student: Student): StudentSummaryDto {
    return {
      id: student.id,
      studentNumber: student.studentNumber.value,
      fullName: student.fullName,
      age: student.age,
      gender: student.gender,
      status: student.status,
      primaryGuardianName: student.primaryGuardian.fullName,
      primaryGuardianPhone: student.primaryGuardian.phoneNumber.value,
      enrollmentDate: student.enrollmentDate.toISOString(),
      hasMedicalConditions: student.medicalConditions.length > 0,
      hasAllergies: student.allergies.length > 0,
    };
  }

  /**
   * Converts an array of Students to a paginated search result DTO
   * 
   * @param students - Array of Student entities
   * @param total - Total number of students matching the search criteria
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns Paginated search result with metadata
   */
  static toSearchResultDto(
    students: Student[],
    total: number,
    page: number,
    limit: number
  ): StudentSearchResultDto {
    const totalPages = Math.ceil(total / limit);
    
    return {
      students: students.map(student => this.toSummaryDto(student)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Converts a GuardianInfo value object to a GuardianDto
   * 
   * @param guardian - The GuardianInfo value object
   * @returns GuardianDto with all guardian information
   */
  static guardianToDto(guardian: GuardianInfo): GuardianDto {
    return {
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      fullName: guardian.fullName,
      relationship: guardian.relationship,
      email: guardian.email.value,
      phoneNumber: guardian.phoneNumber.value,
      address: guardian.address ? this.addressToDto(guardian.address) : undefined,
      isEmergencyContact: guardian.isEmergencyContact,
      isPrimaryContact: guardian.isPrimaryContact,
    };
  }

  /**
   * Converts an Address value object to an AddressDto
   * 
   * @param address - The Address value object
   * @returns AddressDto with formatted address information
   */
  static addressToDto(address: Address): AddressDto {
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      fullAddress: address.toString(),
    };
  }

  /**
   * Converts a CreateStudentDto to StudentProps for domain entity creation
   * Validates and transforms DTO data into domain-compatible format
   * 
   * @param dto - The CreateStudentDto from the API
   * @returns StudentProps ready for Student.create()
   */
  static createDtoToProps(dto: CreateStudentDto): StudentProps {
    return {
      studentNumber: StudentNumber.generate(), // Auto-generate student number
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      dateOfBirth: new Date(dto.dateOfBirth),
      gender: dto.gender,
      email: dto.email ? new Email(dto.email.trim()) : undefined,
      phoneNumber: dto.phoneNumber ? new PhoneNumber(dto.phoneNumber.trim()) : undefined,
      address: this.createAddressDtoToValueObject(dto.address),
      guardians: dto.guardians.map(guardianDto => this.createGuardianDtoToValueObject(guardianDto)),
      status: STUDENT_STATUS.ACTIVE, // New students start as active
      enrollmentDate: new Date(), // Current date as enrollment date
      nationalId: dto.nationalId?.trim(),
      bloodType: dto.bloodType?.trim(),
      allergies: dto.allergies?.map(allergy => allergy.trim()).filter(Boolean) || [],
      medicalConditions: dto.medicalConditions?.map(condition => condition.trim()).filter(Boolean) || [],
      notes: dto.notes?.trim(),
      tenantId: dto.tenantId,
    };
  }

  /**
   * Converts a CreateGuardianDto to a GuardianInfo value object
   * 
   * @param dto - The CreateGuardianDto
   * @returns GuardianInfo value object
   */
  static createGuardianDtoToValueObject(dto: CreateGuardianDto): GuardianInfo {
    return new GuardianInfo(
      dto.firstName.trim(),
      dto.lastName.trim(),
      dto.relationship.toLowerCase().trim(),
      new Email(dto.email.trim()),
      new PhoneNumber(dto.phoneNumber.trim()),
      dto.isEmergencyContact,
      dto.isPrimaryContact,
      dto.address ? this.createAddressDtoToValueObject(dto.address) : undefined
    );
  }

  /**
   * Converts a CreateAddressDto to an Address value object
   * 
   * @param dto - The CreateAddressDto
   * @returns Address value object
   */
  static createAddressDtoToValueObject(dto: CreateAddressDto): Address {
    return new Address(
      dto.street.trim(),
      dto.city.trim(),
      dto.state.trim(),
      dto.zipCode.trim(),
      dto.country?.trim() || 'US'
    );
  }

  /**
   * Applies updates from UpdateStudentDto to a Student entity
   * Only updates fields that are provided in the DTO
   * 
   * @param student - The existing Student entity
   * @param updateDto - The UpdateStudentDto with changes
   * @returns void (modifies the student entity in place)
   */
  static applyUpdateDto(student: Student, updateDto: UpdateStudentDto): void {
    // Update personal information if provided
    if (updateDto.firstName || updateDto.lastName || updateDto.email || updateDto.phoneNumber) {
      student.updatePersonalInfo(
        updateDto.firstName?.trim() || student.firstName,
        updateDto.lastName?.trim() || student.lastName,
        updateDto.email ? new Email(updateDto.email.trim()) : student.email,
        updateDto.phoneNumber ? new PhoneNumber(updateDto.phoneNumber.trim()) : student.phoneNumber
      );
    }

    // Update address if provided
    if (updateDto.address) {
      student.updateAddress(this.createAddressDtoToValueObject(updateDto.address));
    }

    // Update medical information if any medical fields are provided
    if (updateDto.bloodType !== undefined || updateDto.allergies !== undefined || updateDto.medicalConditions !== undefined) {
      student.updateMedicalInfo(
        updateDto.bloodType?.trim() || student.bloodType,
        updateDto.allergies?.map(allergy => allergy.trim()).filter(Boolean) || student.allergies,
        updateDto.medicalConditions?.map(condition => condition.trim()).filter(Boolean) || student.medicalConditions
      );
    }

    // Add note if provided
    if (updateDto.notes) {
      student.addNote(updateDto.notes.trim());
    }
  }

  /**
   * Validates that a CreateStudentDto has the required guardian configuration
   * Ensures business rules are met before domain object creation
   * 
   * @param dto - The CreateStudentDto to validate
   * @throws ValidationError if guardian requirements are not met
   */
  static validateGuardianRequirements(dto: CreateStudentDto): void {
    if (!dto.guardians || dto.guardians.length === 0) {
      throw new Error('At least one guardian is required');
    }

    const primaryContacts = dto.guardians.filter(g => g.isPrimaryContact);
    if (primaryContacts.length !== 1) {
      throw new Error('Exactly one guardian must be designated as primary contact');
    }

    const emergencyContacts = dto.guardians.filter(g => g.isEmergencyContact);
    if (emergencyContacts.length === 0) {
      throw new Error('At least one guardian must be designated as emergency contact');
    }

    // Check for duplicate emails
    const emails = dto.guardians.map(g => g.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      throw new Error('Guardian emails must be unique');
    }

    // Check for duplicate phone numbers
    const phones = dto.guardians.map(g => g.phoneNumber.replace(/\D/g, ''));
    const uniquePhones = new Set(phones);
    if (phones.length !== uniquePhones.size) {
      throw new Error('Guardian phone numbers must be unique');
    }
  }

  /**
   * Validates student age requirements based on date of birth
   * 
   * @param dateOfBirth - The student's date of birth
   * @throws Error if age requirements are not met
   */
  static validateAgeRequirements(dateOfBirth: Date): void {
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      actualAge--;
    }

    if (actualAge < 3) {
      throw new Error('Student must be at least 3 years old');
    }

    if (actualAge > 25) {
      throw new Error('Student cannot be older than 25 years');
    }

    if (dateOfBirth > today) {
      throw new Error('Date of birth cannot be in the future');
    }
  }
}