import { ValueObject } from './base';
import { ValidationError } from '../exceptions/domain-exceptions';
import { isValidEmail, isValidPhoneNumber } from '../utils/common';

export class Email extends ValueObject {
  constructor(private readonly _value: string) {
    super();
    if (!_value) {
      throw new ValidationError('email', _value, 'Email is required');
    }
    if (!isValidEmail(_value)) {
      throw new ValidationError('email', _value, 'Invalid email format');
    }
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof Email)) {
      return false;
    }
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}

export class PhoneNumber extends ValueObject {
  constructor(private readonly _value: string) {
    super();
    if (!_value) {
      throw new ValidationError('phoneNumber', _value, 'Phone number is required');
    }
    if (!isValidPhoneNumber(_value)) {
      throw new ValidationError('phoneNumber', _value, 'Invalid phone number format');
    }
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof PhoneNumber)) {
      return false;
    }
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}

export class Money extends ValueObject {
  constructor(
    private readonly _amount: number,
    private readonly _currency: string = 'USD'
  ) {
    super();
    if (_amount < 0) {
      throw new ValidationError('amount', _amount, 'Amount cannot be negative');
    }
    if (!_currency || _currency.length !== 3) {
      throw new ValidationError('currency', _currency, 'Currency must be a valid 3-letter code');
    }
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  public add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot add different currencies: ${this._currency} and ${other._currency}`);
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  public subtract(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot subtract different currencies: ${this._currency} and ${other._currency}`);
    }
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new Error('Subtraction would result in negative amount');
    }
    return new Money(result, this._currency);
  }

  public multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Factor cannot be negative');
    }
    return new Money(this._amount * factor, this._currency);
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof Money)) {
      return false;
    }
    return this._amount === other._amount && this._currency === other._currency;
  }

  public toString(): string {
    return `${this._amount} ${this._currency}`;
  }
}

export class Address extends ValueObject {
  constructor(
    private readonly _street: string,
    private readonly _city: string,
    private readonly _state: string,
    private readonly _zipCode: string,
    private readonly _country: string = 'US'
  ) {
    super();
    if (!_street?.trim()) {
      throw new ValidationError('street', _street, 'Street is required');
    }
    if (!_city?.trim()) {
      throw new ValidationError('city', _city, 'City is required');
    }
    if (!_state?.trim()) {
      throw new ValidationError('state', _state, 'State is required');
    }
    if (!_zipCode?.trim()) {
      throw new ValidationError('zipCode', _zipCode, 'Zip code is required');
    }
    if (!_country?.trim()) {
      throw new ValidationError('country', _country, 'Country is required');
    }
  }

  get street(): string {
    return this._street;
  }

  get city(): string {
    return this._city;
  }

  get state(): string {
    return this._state;
  }

  get zipCode(): string {
    return this._zipCode;
  }

  get country(): string {
    return this._country;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof Address)) {
      return false;
    }
    return (
      this._street === other._street &&
      this._city === other._city &&
      this._state === other._state &&
      this._zipCode === other._zipCode &&
      this._country === other._country
    );
  }

  public toString(): string {
    return `${this._street}, ${this._city}, ${this._state} ${this._zipCode}, ${this._country}`;
  }
}

export class Grade extends ValueObject {
  constructor(
    private readonly _value: number,
    private readonly _maxValue: number = 100,
    private readonly _minValue: number = 0
  ) {
    super();
    if (_value < _minValue || _value > _maxValue) {
      throw new ValidationError(
        'grade',
        _value,
        `Grade must be between ${_minValue} and ${_maxValue}`
      );
    }
  }

  get value(): number {
    return this._value;
  }

  get maxValue(): number {
    return this._maxValue;
  }

  get minValue(): number {
    return this._minValue;
  }

  get percentage(): number {
    return (this._value / this._maxValue) * 100;
  }

  public getLetterGrade(): string {
    const percentage = this.percentage;
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  public isPassing(passingGrade: number = 60): boolean {
    return this.percentage >= passingGrade;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof Grade)) {
      return false;
    }
    return (
      this._value === other._value &&
      this._maxValue === other._maxValue &&
      this._minValue === other._minValue
    );
  }

  public toString(): string {
    return `${this._value}/${this._maxValue} (${this.getLetterGrade()})`;
  }
}

export class DateRange extends ValueObject {
  constructor(
    private readonly _startDate: Date,
    private readonly _endDate: Date
  ) {
    super();
    if (_startDate >= _endDate) {
      throw new ValidationError('dateRange', { _startDate, _endDate }, 'Start date must be before end date');
    }
  }

  get startDate(): Date {
    return new Date(this._startDate);
  }

  get endDate(): Date {
    return new Date(this._endDate);
  }

  get durationInDays(): number {
    const diffTime = Math.abs(this._endDate.getTime() - this._startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate;
  }

  public overlaps(other: DateRange): boolean {
    return this._startDate <= other._endDate && this._endDate >= other._startDate;
  }

  public equals(other: ValueObject): boolean {
    if (!(other instanceof DateRange)) {
      return false;
    }
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime()
    );
  }

  public toString(): string {
    return `${this._startDate.toISOString().split('T')[0]} to ${this._endDate.toISOString().split('T')[0]}`;
  }
}