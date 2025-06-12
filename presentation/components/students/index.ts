/**
 * Student Components Exports
 * 
 * This file provides a clean interface for accessing all student-related components
 * in the presentation layer. These components implement the user interface for
 * the Student Management bounded context.
 * 
 * Components included:
 * - StudentList: Comprehensive list view with search, filtering, and pagination
 * - StudentForm: Multi-step form for creating and editing students
 * - StudentDetail: Detailed view of student information with tabbed interface
 * 
 * Architecture Notes:
 * - All components follow Clean Architecture principles
 * - Implement proper error handling and loading states
 * - Support responsive design and accessibility
 * - Integrate with the application's API layer
 * - Use shadcn/ui components for consistent design
 * - Include comprehensive commenting for maintainability
 */

export { StudentList } from './student-list';
export { StudentForm } from './student-form';
export { StudentDetail } from './student-detail';

// Type exports for component props
export type { StudentListProps } from './student-list';
export type { StudentFormProps } from './student-form';
export type { StudentDetailProps } from './student-detail';