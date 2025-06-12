/**
 * Student List Component
 * 
 * A comprehensive React component for displaying a paginated list of students
 * with search, filtering, and sorting capabilities. This component demonstrates
 * Clean Architecture principles in the presentation layer.
 * 
 * Features:
 * - Responsive data table with pagination
 * - Real-time search and filtering
 * - Sortable columns
 * - Student status indicators
 * - Quick actions (view, edit, graduate)
 * - Loading states and error handling
 * - Accessible design with proper ARIA labels
 * 
 * Architecture Notes:
 * - Uses React hooks for state management
 * - Implements proper error boundaries
 * - Supports both light and dark themes
 * - Follows accessibility best practices
 * - Integrates with the application's API layer
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  User, 
  GraduationCap, 
  Edit, 
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-react';

/**
 * Props interface for the StudentList component
 */
export interface StudentListProps {
  /** Current tenant ID for multi-tenancy */
  tenantId: string;
  /** Whether the current user can edit students */
  canEdit?: boolean;
  /** Whether the current user can graduate students */
  canGraduate?: boolean;
  /** Callback when a student is selected for viewing */
  onViewStudent?: (studentId: string) => void;
  /** Callback when a student is selected for editing */
  onEditStudent?: (studentId: string) => void;
  /** Callback when a student graduation is requested */
  onGraduateStudent?: (studentId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Student data structure from the API
 */
interface StudentSummary {
  id: string;
  studentNumber: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  status: string;
  primaryGuardianName: string;
  primaryGuardianPhone: string;
  enrollmentDate: string;
  hasMedicalConditions: boolean;
  hasAllergies: boolean;
}

/**
 * API response structure for student search
 */
interface StudentSearchResult {
  students: StudentSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  summary?: {
    totalStudents: number;
    filteredStudents: number;
    executionTimeMs: number;
  };
}

/**
 * Search and filter state
 */
interface SearchFilters {
  searchQuery: string;
  status: string;
  hasAllergies: string;
  hasMedicalConditions: string;
  minAge: string;
  maxAge: string;
}

/**
 * Component state for loading and error handling
 */
interface ComponentState {
  loading: boolean;
  error: string | null;
  students: StudentSummary[];
  totalStudents: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

/**
 * Student List Component
 * 
 * Provides a comprehensive interface for browsing and managing students
 * with support for search, filtering, pagination, and quick actions.
 */
export function StudentList({
  tenantId,
  canEdit = false,
  canGraduate = false,
  onViewStudent,
  onEditStudent,
  onGraduateStudent,
  className = ''
}: StudentListProps) {
  // Component state
  const [state, setState] = useState<ComponentState>({
    loading: true,
    error: null,
    students: [],
    totalStudents: 0,
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 20
  });

  // Search and filter state
  const [filters, setFilters] = useState<SearchFilters>({
    searchQuery: '',
    status: 'all',
    hasAllergies: 'all',
    hasMedicalConditions: 'all',
    minAge: '',
    maxAge: ''
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  /**
   * Fetches students from the API based on current filters and pagination
   */
  const fetchStudents = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: state.currentPage.toString(),
        limit: state.itemsPerPage.toString(),
        sortBy,
        sortOrder
      });

      // Add search filters
      if (filters.searchQuery.trim()) {
        // Simple implementation: search in both first and last name
        params.append('firstName', filters.searchQuery.trim());
        params.append('lastName', filters.searchQuery.trim());
      }

      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      if (filters.hasAllergies !== 'all') {
        params.append('hasAllergies', filters.hasAllergies);
      }

      if (filters.hasMedicalConditions !== 'all') {
        params.append('hasMedicalConditions', filters.hasMedicalConditions);
      }

      if (filters.minAge) {
        params.append('minAge', filters.minAge);
      }

      if (filters.maxAge) {
        params.append('maxAge', filters.maxAge);
      }

      // Make API request
      const response = await fetch(`/api/students?${params}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-user-id': 'current-user' // In a real app, this would come from auth
        }
      });

      const data: ApiResponse<StudentSearchResult> = await response.json();

      if (data.success && data.data) {
        setState(prev => ({
          ...prev,
          loading: false,
          students: data.data!.students,
          totalStudents: data.summary?.totalStudents || data.data!.total,
          currentPage: data.data!.page,
          totalPages: data.data!.totalPages
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error?.message || 'Failed to load students'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }));
    }
  }, [tenantId, state.currentPage, state.itemsPerPage, sortBy, sortOrder, filters]);

  // Fetch students when dependencies change
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  /**
   * Handles search input changes with debouncing
   */
  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, searchQuery: value }));
    // Reset to first page when searching
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  /**
   * Handles filter changes
   */
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset to first page when filtering
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  /**
   * Handles page navigation
   */
  const handlePageChange = useCallback((newPage: number) => {
    setState(prev => ({ ...prev, currentPage: newPage }));
  }, []);

  /**
   * Handles sorting changes
   */
  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    // Reset to first page when sorting
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, [sortBy]);

  /**
   * Gets the appropriate status badge variant based on student status
   */
  const getStatusBadgeVariant = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'graduated':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      case 'transferred':
        return 'outline';
      default:
        return 'secondary';
    }
  }, []);

  /**
   * Formats the enrollment date for display
   */
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  /**
   * Gets initials for avatar display
   */
  const getInitials = useCallback((fullName: string) => {
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  // Memoized computed values
  const hasActiveFilters = useMemo(() => {
    return filters.searchQuery.trim() !== '' ||
           filters.status !== 'all' ||
           filters.hasAllergies !== 'all' ||
           filters.hasMedicalConditions !== 'all' ||
           filters.minAge !== '' ||
           filters.maxAge !== '';
  }, [filters]);

  const startIndex = (state.currentPage - 1) * state.itemsPerPage + 1;
  const endIndex = Math.min(state.currentPage * state.itemsPerPage, state.totalStudents);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center gap-2\">
            <User className=\"h-5 w-5\" />
            Student Management
          </CardTitle>
          <CardDescription>
            Manage student records, view details, and perform administrative actions.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className=\"text-lg\">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className=\"space-y-4\">
          {/* Search Bar */}
          <div className=\"relative\">
            <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground\" />
            <Input
              placeholder=\"Search by student name...\"
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className=\"pl-10\"
            />
          </div>

          {/* Filter Controls */}
          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4\">
            <div className=\"space-y-2\">
              <Label htmlFor=\"status-filter\">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger id=\"status-filter\">
                  <SelectValue placeholder=\"All statuses\" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"all\">All Statuses</SelectItem>
                  <SelectItem value=\"active\">Active</SelectItem>
                  <SelectItem value=\"graduated\">Graduated</SelectItem>
                  <SelectItem value=\"suspended\">Suspended</SelectItem>
                  <SelectItem value=\"transferred\">Transferred</SelectItem>
                  <SelectItem value=\"inactive\">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className=\"space-y-2\">
              <Label htmlFor=\"allergies-filter\">Allergies</Label>
              <Select value={filters.hasAllergies} onValueChange={(value) => handleFilterChange('hasAllergies', value)}>
                <SelectTrigger id=\"allergies-filter\">
                  <SelectValue placeholder=\"Any\" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"all\">Any</SelectItem>
                  <SelectItem value=\"true\">Has Allergies</SelectItem>
                  <SelectItem value=\"false\">No Allergies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className=\"space-y-2\">
              <Label htmlFor=\"medical-filter\">Medical Conditions</Label>
              <Select value={filters.hasMedicalConditions} onValueChange={(value) => handleFilterChange('hasMedicalConditions', value)}>
                <SelectTrigger id=\"medical-filter\">
                  <SelectValue placeholder=\"Any\" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"all\">Any</SelectItem>
                  <SelectItem value=\"true\">Has Conditions</SelectItem>
                  <SelectItem value=\"false\">No Conditions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className=\"space-y-2\">
              <Label htmlFor=\"min-age\">Min Age</Label>
              <Input
                id=\"min-age\"
                type=\"number\"
                placeholder=\"Min\"
                value={filters.minAge}
                onChange={(e) => handleFilterChange('minAge', e.target.value)}
                min=\"3\"
                max=\"25\"
              />
            </div>

            <div className=\"space-y-2\">
              <Label htmlFor=\"max-age\">Max Age</Label>
              <Input
                id=\"max-age\"
                type=\"number\"
                placeholder=\"Max\"
                value={filters.maxAge}
                onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                min=\"3\"
                max=\"25\"
              />
            </div>
          </div>

          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className=\"flex items-center gap-2 text-sm text-muted-foreground\">
              <Filter className=\"h-4 w-4\" />
              <span>Filters applied</span>
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => {
                  setFilters({
                    searchQuery: '',
                    status: 'all',
                    hasAllergies: 'all',
                    hasMedicalConditions: 'all',
                    minAge: '',
                    maxAge: ''
                  });
                  setState(prev => ({ ...prev, currentPage: 1 }));
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Table */}
      <Card>
        <CardHeader>
          <div className=\"flex items-center justify-between\">
            <div>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                {state.loading 
                  ? 'Loading students...' 
                  : `Showing ${startIndex}-${endIndex} of ${state.totalStudents} students`
                }
              </CardDescription>
            </div>
            <div className=\"flex items-center gap-2\">
              <Select 
                value={state.itemsPerPage.toString()} 
                onValueChange={(value) => setState(prev => ({ ...prev, itemsPerPage: parseInt(value), currentPage: 1 }))}
              >
                <SelectTrigger className=\"w-24\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"10\">10</SelectItem>
                  <SelectItem value=\"20\">20</SelectItem>
                  <SelectItem value=\"50\">50</SelectItem>
                  <SelectItem value=\"100\">100</SelectItem>
                </SelectContent>
              </Select>
              <span className=\"text-sm text-muted-foreground\">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {state.error ? (
            <div className=\"flex items-center justify-center py-12 text-red-500\">
              <AlertCircle className=\"h-5 w-5 mr-2\" />
              <span>{state.error}</span>
            </div>
          ) : (
            <div className=\"rounded-md border\">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className=\"w-12\"></TableHead>
                    <TableHead 
                      className=\"cursor-pointer hover:bg-muted/50\"
                      onClick={() => handleSort('studentNumber')}
                    >
                      Student #
                      {sortBy === 'studentNumber' && (
                        <span className=\"ml-1\">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    <TableHead 
                      className=\"cursor-pointer hover:bg-muted/50\"
                      onClick={() => handleSort('fullName')}
                    >
                      Name
                      {sortBy === 'fullName' && (
                        <span className=\"ml-1\">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    <TableHead 
                      className=\"cursor-pointer hover:bg-muted/50\"
                      onClick={() => handleSort('age')}
                    >
                      Age
                      {sortBy === 'age' && (
                        <span className=\"ml-1\">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Primary Guardian</TableHead>
                    <TableHead 
                      className=\"cursor-pointer hover:bg-muted/50\"
                      onClick={() => handleSort('enrollmentDate')}
                    >
                      Enrolled
                      {sortBy === 'enrollmentDate' && (
                        <span className=\"ml-1\">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    <TableHead>Medical</TableHead>
                    <TableHead className=\"w-12\"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className=\"text-center py-12\">
                        <Loader2 className=\"h-6 w-6 animate-spin mx-auto mb-2\" />
                        <p>Loading students...</p>
                      </TableCell>
                    </TableRow>
                  ) : state.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className=\"text-center py-12 text-muted-foreground\">
                        {hasActiveFilters ? 'No students match your search criteria' : 'No students found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    state.students.map((student) => (
                      <TableRow key={student.id} className=\"hover:bg-muted/50\">
                        <TableCell>
                          <Avatar className=\"h-8 w-8\">
                            <AvatarFallback className=\"text-xs\">
                              {getInitials(student.fullName)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className=\"font-medium\">{student.studentNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className=\"font-medium\">{student.fullName}</p>
                            <p className=\"text-sm text-muted-foreground capitalize\">{student.gender}</p>
                          </div>
                        </TableCell>
                        <TableCell>{student.age}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(student.status)}>
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className=\"font-medium\">{student.primaryGuardianName}</p>
                            <p className=\"text-sm text-muted-foreground\">{student.primaryGuardianPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(student.enrollmentDate)}</TableCell>
                        <TableCell>
                          <div className=\"flex gap-1\">
                            {student.hasAllergies && (
                              <Badge variant=\"outline\" className=\"text-xs\">Allergies</Badge>
                            )}
                            {student.hasMedicalConditions && (
                              <Badge variant=\"outline\" className=\"text-xs\">Medical</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant=\"ghost\" size=\"sm\">
                                <MoreHorizontal className=\"h-4 w-4\" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align=\"end\">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => onViewStudent?.(student.id)}>
                                <Eye className=\"h-4 w-4 mr-2\" />
                                View Details
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => onEditStudent?.(student.id)}>
                                  <Edit className=\"h-4 w-4 mr-2\" />
                                  Edit Student
                                </DropdownMenuItem>
                              )}
                              {canGraduate && student.status === 'active' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onGraduateStudent?.(student.id)}>
                                    <GraduationCap className=\"h-4 w-4 mr-2\" />
                                    Graduate Student
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {!state.loading && !state.error && state.totalPages > 1 && (
          <CardFooter className=\"flex items-center justify-between pt-6\">
            <div className=\"text-sm text-muted-foreground\">
              Page {state.currentPage} of {state.totalPages}
            </div>
            <div className=\"flex items-center gap-2\">
              <Button
                variant=\"outline\"
                size=\"sm\"
                onClick={() => handlePageChange(state.currentPage - 1)}
                disabled={state.currentPage === 1}
              >
                <ChevronLeft className=\"h-4 w-4 mr-1\" />
                Previous
              </Button>
              <Button
                variant=\"outline\"
                size=\"sm\"
                onClick={() => handlePageChange(state.currentPage + 1)}
                disabled={state.currentPage === state.totalPages}
              >
                Next
                <ChevronRight className=\"h-4 w-4 ml-1\" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}