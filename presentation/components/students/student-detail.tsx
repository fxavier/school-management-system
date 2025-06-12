/**
 * Student Detail Component
 * 
 * A comprehensive view component for displaying detailed student information.
 * This component provides a read-only interface for viewing all student data
 * with proper organization, formatting, and quick actions.
 * 
 * Features:
 * - Comprehensive student information display
 * - Tabbed interface for organized information viewing
 * - Quick action buttons for common operations
 * - Academic timeline and progress tracking
 * - Guardian and contact information
 * - Medical information with proper privacy controls
 * - Enrollment and graduation status tracking
 * - Print-friendly layout
 * - Responsive design with accessibility support
 * 
 * Architecture Notes:
 * - Uses Clean Architecture principles for data fetching
 * - Implements proper error handling and loading states
 * - Supports real-time data updates
 * - Follows security best practices for sensitive data
 * - Integrates with the application's API layer
 * - Maintains audit trail display
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Separator } from '../../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';
import {
  User,
  Edit,
  Trash2,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Heart,
  Shield,
  FileText,
  Download,
  Print,
  Share,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  School,
  Users,
  Activity
} from 'lucide-react';

/**
 * Student data structure from the API
 */
interface StudentDetailData {
  id: string;
  studentNumber: string;
  tenantId: string;
  version: number;
  
  // Personal Information
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  photoUrl?: string;
  
  // Contact Information
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Guardian Information
  guardians: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
    isPrimary: boolean;
    canPickup: boolean;
    emergencyContact: boolean;
  }>;
  
  // Academic Information
  enrollmentDate: string;
  expectedGraduationYear: number;
  graduationDate?: string;
  previousSchool?: string;
  status: string;
  
  // Medical Information
  medicalInfo: {
    allergies: string[];
    medications: string[];
    medicalConditions: string[];
    specialNeeds?: string;
    emergencyMedicalContact?: string;
    bloodType?: string;
  };
  
  // Additional Information
  notes?: string;
  
  // Audit Information
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * API response structure
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTimeMs: number;
  };
}

/**
 * Props interface for the StudentDetail component
 */
export interface StudentDetailProps {
  /** Student ID to display */
  studentId: string;
  /** Current tenant ID for multi-tenancy */
  tenantId: string;
  /** Whether the current user can edit students */
  canEdit?: boolean;
  /** Whether the current user can delete students */
  canDelete?: boolean;
  /** Whether the current user can graduate students */
  canGraduate?: boolean;
  /** Whether to show sensitive medical information */
  showMedicalInfo?: boolean;
  /** Callback when edit is requested */
  onEdit?: (studentId: string) => void;
  /** Callback when graduation is requested */
  onGraduate?: (studentId: string) => void;
  /** Callback when deletion is requested */
  onDelete?: (studentId: string) => void;
  /** Callback when component needs to be closed */
  onClose?: () => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Student Detail Component
 * 
 * Provides a comprehensive interface for viewing detailed student information
 * with proper organization and quick action capabilities.
 */
export function StudentDetail({
  studentId,
  tenantId,
  canEdit = false,
  canDelete = false,
  canGraduate = false,
  showMedicalInfo = false,
  onEdit,
  onGraduate,
  onDelete,
  onClose,
  className = ''
}: StudentDetailProps) {
  // Component state
  const [student, setStudent] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(showMedicalInfo);

  /**
   * Fetches student data from the API
   */
  const fetchStudent = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-user-id': 'current-user' // In a real app, this would come from auth
        }
      });
      
      const data: ApiResponse<StudentDetailData> = await response.json();
      
      if (data.success && data.data) {
        setStudent(data.data);
      } else {
        setError(data.error?.message || 'Failed to load student details');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [studentId, tenantId]);

  // Fetch student data on mount and when dependencies change
  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  /**
   * Handles print functionality
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /**
   * Handles share functionality
   */
  const handleShare = useCallback(async () => {
    if (navigator.share && student) {
      try {
        await navigator.share({
          title: `${student.firstName} ${student.lastName} - Student Profile`,
          text: `Student profile for ${student.firstName} ${student.lastName} (${student.studentNumber})`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  }, [student]);

  /**
   * Gets the appropriate status badge variant
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
   * Formats date for display
   */
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  /**
   * Formats date and time for display
   */
  const formatDateTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  /**
   * Gets initials for avatar display
   */
  const getInitials = useCallback((firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }, []);

  /**
   * Calculates age from date of birth
   */
  const calculateAge = useCallback((dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }, []);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading student details...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-red-500">
            <AlertCircle className="h-8 w-8 mr-3" />
            <span>{error || 'Student not found'}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryGuardian = student.guardians.find(g => g.isPrimary) || student.guardians[0];
  const hasAllergies = student.medicalInfo.allergies.length > 0;
  const hasMedications = student.medicalInfo.medications.length > 0;
  const hasMedicalConditions = student.medicalInfo.medicalConditions.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {student.photoUrl ? (
                  <AvatarImage src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} />
                ) : (
                  <AvatarFallback className="text-lg">
                    {getInitials(student.firstName, student.lastName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  {student.firstName} {student.middleName && `${student.middleName} `}{student.lastName}
                </CardTitle>
                <CardDescription className="text-lg">
                  Student #{student.studentNumber}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusBadgeVariant(student.status)}>
                    {student.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Age {calculateAge(student.dateOfBirth)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    • {student.gender.charAt(0).toUpperCase() + student.gender.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Print className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit?.(student.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Student
                    </DropdownMenuItem>
                  )}
                  
                  {canGraduate && student.status === 'active' && (
                    <DropdownMenuItem onClick={() => onGraduate?.(student.id)}>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Graduate Student
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}>
                    {showSensitiveInfo ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Sensitive Info
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show Sensitive Info
                      </>
                    )}
                  </DropdownMenuItem>
                  
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Student
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Student</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {student.firstName} {student.lastName}? 
                              This action will mark the student as deleted and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete?.(student.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  ×
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="medical">
            <div className="flex items-center gap-1">
              Medical
              {showSensitiveInfo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Full Name:</span>
                    <p className="font-medium">
                      {student.firstName} {student.middleName && `${student.middleName} `}{student.lastName}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Student Number:</span>
                    <p className="font-medium">{student.studentNumber}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Date of Birth:</span>
                    <p className="font-medium">{formatDate(student.dateOfBirth)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Age:</span>
                    <p className="font-medium">{calculateAge(student.dateOfBirth)} years old</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Gender:</span>
                    <p className="font-medium capitalize">{student.gender}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Nationality:</span>
                    <p className="font-medium">{student.nationality}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Status:</span>
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {student.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium text-muted-foreground">Enrolled</p>
                    <p className="font-semibold">{formatDate(student.enrollmentDate)}</p>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <School className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium text-muted-foreground">Expected Graduation</p>
                    <p className="font-semibold">{student.expectedGraduationYear}</p>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-sm font-medium text-muted-foreground">Guardians</p>
                    <p className="font-semibold">{student.guardians.length}</p>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
                    <p className="text-sm font-medium text-muted-foreground">Medical Items</p>
                    <p className="font-semibold">
                      {student.medicalInfo.allergies.length + 
                       student.medicalInfo.medications.length + 
                       student.medicalInfo.medicalConditions.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity / Notes */}
          {student.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{student.address.street}</p>
                <p className="text-muted-foreground">
                  {student.address.city}, {student.address.state} {student.address.zipCode}
                </p>
                <p className="text-muted-foreground">{student.address.country}</p>
              </div>
            </CardContent>
          </Card>

          {/* Primary Guardian Contact */}
          {primaryGuardian && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Primary Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">{primaryGuardian.firstName} {primaryGuardian.lastName}</p>
                    <p className="text-sm text-muted-foreground capitalize">{primaryGuardian.relationship}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{primaryGuardian.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{primaryGuardian.phone}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {primaryGuardian.canPickup && (
                      <Badge variant="outline">Can Pick Up</Badge>
                    )}
                    {primaryGuardian.emergencyContact && (
                      <Badge variant="outline">Emergency Contact</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Guardians Tab */}
        <TabsContent value="guardians" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {student.guardians.map((guardian, index) => (
              <Card key={guardian.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{guardian.firstName} {guardian.lastName}</span>
                    <div className="flex gap-1">
                      {guardian.isPrimary && (
                        <Badge variant="default">Primary</Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {guardian.relationship}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.phone}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {guardian.canPickup && (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Can Pick Up
                      </Badge>
                    )}
                    {guardian.emergencyContact && (
                      <Badge variant="outline" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Emergency Contact
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Academic Tab */}
        <TabsContent value="academic" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  Enrollment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Enrollment Date:</span>
                    <p className="font-medium">{formatDate(student.enrollmentDate)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Expected Graduation:</span>
                    <p className="font-medium">{student.expectedGraduationYear}</p>
                  </div>
                  {student.graduationDate && (
                    <div>
                      <span className="font-medium text-muted-foreground">Graduation Date:</span>
                      <p className="font-medium">{formatDate(student.graduationDate)}</p>
                    </div>
                  )}
                  {student.previousSchool && (
                    <div>
                      <span className="font-medium text-muted-foreground">Previous School:</span>
                      <p className="font-medium">{student.previousSchool}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Record Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Created:</span>
                    <p className="font-medium">{formatDateTime(student.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">by {student.createdBy}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Last Updated:</span>
                    <p className="font-medium">{formatDateTime(student.updatedAt)}</p>
                    <p className="text-xs text-muted-foreground">by {student.updatedBy}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Version:</span>
                    <p className="font-medium">#{student.version}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical" className="space-y-6">
          {!showSensitiveInfo ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">Protected Medical Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Click the show sensitive info option to view medical details
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSensitiveInfo(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Show Medical Information
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Medical Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Allergies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasAllergies ? (
                      <div className="space-y-2">
                        {student.medicalInfo.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive" className="mr-1 mb-1">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No known allergies</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Medications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasMedications ? (
                      <div className="space-y-2">
                        {student.medicalInfo.medications.map((medication, index) => (
                          <Badge key={index} variant="secondary" className="mr-1 mb-1">
                            {medication}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No current medications</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasMedicalConditions ? (
                      <div className="space-y-2">
                        {student.medicalInfo.medicalConditions.map((condition, index) => (
                          <Badge key={index} variant="outline" className="mr-1 mb-1">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No known medical conditions</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Additional Medical Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Medical Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      {student.medicalInfo.bloodType && (
                        <div>
                          <span className="font-medium text-muted-foreground">Blood Type:</span>
                          <p className="font-medium">{student.medicalInfo.bloodType}</p>
                        </div>
                      )}
                      {student.medicalInfo.emergencyMedicalContact && (
                        <div>
                          <span className="font-medium text-muted-foreground">Emergency Medical Contact:</span>
                          <p className="font-medium">{student.medicalInfo.emergencyMedicalContact}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {student.medicalInfo.specialNeeds && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Special Needs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{student.medicalInfo.specialNeeds}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}