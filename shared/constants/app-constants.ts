export const APP_CONFIG = {
  name: 'School Management System',
  version: '1.0.0',
  description: 'Comprehensive school management system built with Clean Architecture',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_AGE: 3,
  MAX_AGE: 100,
} as const;

export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
  TIME_ONLY: 'HH:mm',
} as const;

export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  BRL: 'BRL',
  GBP: 'GBP',
} as const;

export const LOCALES = {
  ENGLISH: 'en',
  PORTUGUESE: 'pt',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  FINANCE_MANAGER: 'finance_manager',
  TRANSPORT_MANAGER: 'transport_manager',
} as const;

export const PERMISSIONS = {
  // Student Management
  STUDENTS_READ: 'students:read',
  STUDENTS_WRITE: 'students:write',
  STUDENTS_DELETE: 'students:delete',
  
  // Academic Management
  COURSES_READ: 'courses:read',
  COURSES_WRITE: 'courses:write',
  COURSES_DELETE: 'courses:delete',
  
  SUBJECTS_READ: 'subjects:read',
  SUBJECTS_WRITE: 'subjects:write',
  SUBJECTS_DELETE: 'subjects:delete',
  
  TEACHERS_READ: 'teachers:read',
  TEACHERS_WRITE: 'teachers:write',
  TEACHERS_DELETE: 'teachers:delete',
  
  // Assessment Management
  ASSESSMENTS_READ: 'assessments:read',
  ASSESSMENTS_WRITE: 'assessments:write',
  ASSESSMENTS_DELETE: 'assessments:delete',
  
  // Attendance Management
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_WRITE: 'attendance:write',
  
  // Finance Management
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  FINANCE_DELETE: 'finance:delete',
  
  // Transport Management
  TRANSPORT_READ: 'transport:read',
  TRANSPORT_WRITE: 'transport:write',
  TRANSPORT_DELETE: 'transport:delete',
  
  // System Administration
  TENANTS_READ: 'tenants:read',
  TENANTS_WRITE: 'tenants:write',
  TENANTS_DELETE: 'tenants:delete',
  
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
} as const;

export const STUDENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  GRADUATED: 'graduated',
  TRANSFERRED: 'transferred',
  SUSPENDED: 'suspended',
  EXPELLED: 'expelled',
} as const;

export const ACADEMIC_YEAR_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export const ASSESSMENT_TYPE = {
  EXAM: 'exam',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
  PROJECT: 'project',
  PRESENTATION: 'presentation',
  PRACTICAL: 'practical',
} as const;

export const GRADE_SCALE = {
  A_PLUS: 'A+',
  A: 'A',
  A_MINUS: 'A-',
  B_PLUS: 'B+',
  B: 'B',
  B_MINUS: 'B-',
  C_PLUS: 'C+',
  C: 'C',
  C_MINUS: 'C-',
  D_PLUS: 'D+',
  D: 'D',
  F: 'F',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_METHOD = {
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  CHECK: 'check',
  SCHOLARSHIP: 'scholarship',
} as const;

export const TRANSPORT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service',
} as const;

export const EVENT_TYPES = {
  // Student Events
  STUDENT_ENROLLED: 'student.enrolled',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_GRADUATED: 'student.graduated',
  STUDENT_TRANSFERRED: 'student.transferred',
  
  // Academic Events
  COURSE_CREATED: 'course.created',
  COURSE_UPDATED: 'course.updated',
  SUBJECT_CREATED: 'subject.created',
  TEACHER_ASSIGNED: 'teacher.assigned',
  
  // Assessment Events
  ASSESSMENT_CREATED: 'assessment.created',
  GRADE_ASSIGNED: 'grade.assigned',
  GRADE_UPDATED: 'grade.updated',
  
  // Attendance Events
  ATTENDANCE_RECORDED: 'attendance.recorded',
  ATTENDANCE_UPDATED: 'attendance.updated',
  
  // Finance Events
  INVOICE_CREATED: 'invoice.created',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_OVERDUE: 'payment.overdue',
  
  // Transport Events
  ROUTE_ASSIGNED: 'route.assigned',
  VEHICLE_ASSIGNED: 'vehicle.assigned',
} as const;

export type AppRole = typeof ROLES[keyof typeof ROLES];
export type AppPermission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type StudentStatus = typeof STUDENT_STATUS[keyof typeof STUDENT_STATUS];
export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];