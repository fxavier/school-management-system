import { ValueObject, ValidationError, Email, PhoneNumber, Address } from '../../shared';

export interface GuardianData {
  firstName: string;
  lastName: string;
  relationship: string;
  email: Email;
  phoneNumber: PhoneNumber;
  address?: Address;
  isEmergencyContact: boolean;
  isPrimaryContact: boolean;
}

export class GuardianInfo extends ValueObject {
  constructor(
    private readonly _firstName: string,
    private readonly _lastName: string,
    private readonly _relationship: string,
    private readonly _email: Email,
    private readonly _phoneNumber: PhoneNumber,
    private readonly _isEmergencyContact: boolean,
    private readonly _isPrimaryContact: boolean,
    private readonly _address?: Address
  ) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this._firstName?.trim()) {
      throw new ValidationError('guardianFirstName', this._firstName, 'Guardian first name is required');
    }
    
    if (!this._lastName?.trim()) {
      throw new ValidationError('guardianLastName', this._lastName, 'Guardian last name is required');
    }
    
    if (!this._relationship?.trim()) {
      throw new ValidationError('guardianRelationship', this._relationship, 'Guardian relationship is required');
    }

    const validRelationships = ['parent', 'stepparent', 'grandparent', 'aunt', 'uncle', 'guardian', 'other'];
    if (!validRelationships.includes(this._relationship.toLowerCase())) {
      throw new ValidationError(
        'guardianRelationship',
        this._relationship,
        `Guardian relationship must be one of: ${validRelationships.join(', ')}`
      );
    }

    if (this._firstName.length < 2 || this._firstName.length > 50) {
      throw new ValidationError('guardianFirstName', this._firstName, 'Guardian first name must be between 2 and 50 characters');
    }

    if (this._lastName.length < 2 || this._lastName.length > 50) {
      throw new ValidationError('guardianLastName', this._lastName, 'Guardian last name must be between 2 and 50 characters');
    }
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

  get relationship(): string {
    return this._relationship;
  }

  get email(): Email {
    return this._email;
  }

  get phoneNumber(): PhoneNumber {
    return this._phoneNumber;
  }

  get address(): Address | undefined {
    return this._address;
  }

  get isEmergencyContact(): boolean {
    return this._isEmergencyContact;
  }

  get isPrimaryContact(): boolean {
    return this._isPrimaryContact;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof GuardianInfo)) {
      return false;
    }
    
    return (
      this._firstName === other._firstName &&
      this._lastName === other._lastName &&
      this._relationship === other._relationship &&
      this._email.equals(other._email) &&
      this._phoneNumber.equals(other._phoneNumber) &&
      this._isEmergencyContact === other._isEmergencyContact &&
      this._isPrimaryContact === other._isPrimaryContact &&
      (this._address ? this._address.equals(other._address!) : !other._address)
    );
  }

  public toString(): string {
    return `${this.fullName} (${this._relationship})`;
  }

  public static fromData(data: GuardianData): GuardianInfo {
    return new GuardianInfo(
      data.firstName,
      data.lastName,
      data.relationship,
      data.email,
      data.phoneNumber,
      data.isEmergencyContact,
      data.isPrimaryContact,
      data.address
    );
  }
}