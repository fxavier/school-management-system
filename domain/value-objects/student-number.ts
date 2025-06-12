import { ValueObject, ValidationError } from '../../shared';

export class StudentNumber extends ValueObject {
  private static readonly PATTERN = /^STU\d{6}$/;
  
  constructor(private readonly _value: string) {
    super();
    this.validate(_value);
  }

  private validate(value: string): void {
    if (!value) {
      throw new ValidationError('studentNumber', value, 'Student number is required');
    }
    
    if (!StudentNumber.PATTERN.test(value)) {
      throw new ValidationError(
        'studentNumber',
        value,
        'Student number must be in format STU123456'
      );
    }
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof StudentNumber)) {
      return false;
    }
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  public static generate(): StudentNumber {
    const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return new StudentNumber(`STU${randomNumber}`);
  }
}