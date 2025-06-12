/**
 * Student Form Component
 * 
 * A comprehensive form component for creating and editing student records.
 * This component handles complex student data input with proper validation,
 * multi-step form flow, and real-time feedback to users.
 * 
 * Features:
 * - Multi-step form wizard for better UX
 * - Real-time validation with error display
 * - Dynamic guardian management (add/remove guardians)
 * - Medical information and allergies tracking
 * - Address management with validation
 * - File upload for student photos
 * - Responsive design with proper accessibility
 * - Integration with the application's API layer
 * 
 * Architecture Notes:
 * - Uses React Hook Form for form state management
 * - Implements proper validation with Zod schemas
 * - Supports both create and edit modes
 * - Follows Clean Architecture principles
 * - Integrates with shadcn/ui components
 * - Maintains proper error boundaries
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Separator } from '../../ui/separator';
import { Progress } from '../../ui/progress';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../ui/form';
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
  UserPlus,
  Users,
  MapPin,
  Heart,
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

/**
 * Validation schema for student form data
 */
const studentFormSchema = z.object({
  // Basic Information
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  middleName: z.string().max(50, 'Middle name too long').optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  nationality: z.string().min(1, 'Nationality is required').max(50, 'Nationality too long'),
  
  // Contact Information
  address: z.object({
    street: z.string().min(1, 'Street address is required').max(100, 'Street address too long'),
    city: z.string().min(1, 'City is required').max(50, 'City too long'),
    state: z.string().min(1, 'State is required').max(50, 'State too long'),
    zipCode: z.string().min(1, 'ZIP code is required').max(20, 'ZIP code too long'),
    country: z.string().min(1, 'Country is required').max(50, 'Country too long'),
  }),
  
  // Guardian Information
  guardians: z.array(z.object({
    firstName: z.string().min(1, 'Guardian first name is required').max(50, 'Name too long'),
    lastName: z.string().min(1, 'Guardian last name is required').max(50, 'Name too long'),
    relationship: z.enum(['mother', 'father', 'guardian', 'grandparent', 'other'], {
      required_error: 'Relationship is required'
    }),
    email: z.string().email('Invalid email address').max(100, 'Email too long'),
    phone: z.string().min(1, 'Phone number is required').max(20, 'Phone number too long'),
    isPrimary: z.boolean(),
    canPickup: z.boolean(),
    emergencyContact: z.boolean(),
  })).min(1, 'At least one guardian is required').max(5, 'Maximum 5 guardians allowed'),
  
  // Academic Information
  enrollmentDate: z.string().min(1, 'Enrollment date is required'),
  expectedGraduationYear: z.string().min(1, 'Expected graduation year is required'),
  previousSchool: z.string().max(100, 'Previous school name too long').optional(),
  
  // Medical Information
  medicalInfo: z.object({
    allergies: z.array(z.string().max(100, 'Allergy description too long')),
    medications: z.array(z.string().max(100, 'Medication description too long')),
    medicalConditions: z.array(z.string().max(100, 'Medical condition description too long')),
    specialNeeds: z.string().max(500, 'Special needs description too long').optional(),
    emergencyMedicalContact: z.string().max(100, 'Contact information too long').optional(),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
  }),
  
  // Additional Information
  notes: z.string().max(1000, 'Notes too long').optional(),
  photoFile: z.any().optional(),
});

/**
 * Type definition for form data
 */
type StudentFormData = z.infer<typeof studentFormSchema>;

/**
 * Props interface for the StudentForm component
 */
export interface StudentFormProps {
  /** Current tenant ID for multi-tenancy */
  tenantId: string;
  /** Student data for editing (undefined for create mode) */
  initialData?: Partial<StudentFormData>;
  /** Whether the form is in edit mode */
  isEditMode?: boolean;
  /** Expected version for optimistic locking (edit mode only) */
  expectedVersion?: number;
  /** Callback when form is submitted successfully */
  onSubmit?: (data: StudentFormData, result: any) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Form step configuration
 */
interface FormStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: (keyof StudentFormData)[];
}

/**
 * Form steps configuration
 */
const FORM_STEPS: FormStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Student personal details',
    icon: User,
    fields: ['firstName', 'lastName', 'middleName', 'dateOfBirth', 'gender', 'nationality']
  },
  {
    id: 'contact',
    title: 'Contact & Address',
    description: 'Address and contact information',
    icon: MapPin,
    fields: ['address']
  },
  {
    id: 'guardians',
    title: 'Guardian Information',
    description: 'Parent and guardian details',
    icon: Users,
    fields: ['guardians']
  },
  {
    id: 'academic',
    title: 'Academic Details',
    description: 'School and enrollment information',
    icon: FileText,
    fields: ['enrollmentDate', 'expectedGraduationYear', 'previousSchool']
  },
  {
    id: 'medical',
    title: 'Medical Information',
    description: 'Health and medical details',
    icon: Heart,
    fields: ['medicalInfo']
  }
];

/**
 * Student Form Component
 * 
 * Provides a comprehensive interface for creating and editing student records
 * with multi-step workflow and comprehensive validation.
 */
export function StudentForm({
  tenantId,
  initialData,
  isEditMode = false,
  expectedVersion,
  onSubmit,
  onCancel,
  className = ''
}: StudentFormProps) {
  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Initialize form with validation
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      middleName: '',
      dateOfBirth: '',
      gender: undefined,
      nationality: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      guardians: [{
        firstName: '',
        lastName: '',
        relationship: undefined,
        email: '',
        phone: '',
        isPrimary: true,
        canPickup: true,
        emergencyContact: true
      }],
      enrollmentDate: '',
      expectedGraduationYear: '',
      previousSchool: '',
      medicalInfo: {
        allergies: [],
        medications: [],
        medicalConditions: [],
        specialNeeds: '',
        emergencyMedicalContact: '',
        bloodType: undefined
      },
      notes: '',
      ...initialData
    },
    mode: 'onChange'
  });

  // Guardian field array management
  const { fields: guardianFields, append: addGuardian, remove: removeGuardian } = useFieldArray({
    control: form.control,
    name: 'guardians'
  });

  // Medical arrays management
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newMedicalCondition, setNewMedicalCondition] = useState('');

  /**
   * Calculates form completion percentage
   */
  const getFormProgress = useCallback(() => {
    const totalSteps = FORM_STEPS.length;
    const completedSteps = currentStep + 1;
    return Math.round((completedSteps / totalSteps) * 100);
  }, [currentStep]);

  /**
   * Validates current step fields
   */
  const validateCurrentStep = useCallback(async () => {
    const currentStepConfig = FORM_STEPS[currentStep];
    const fieldsToValidate = currentStepConfig.fields;
    
    const result = await form.trigger(fieldsToValidate as any);
    return result;
  }, [currentStep, form]);

  /**
   * Handles moving to next step
   */
  const handleNextStep = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateCurrentStep]);

  /**
   * Handles moving to previous step
   */
  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  /**
   * Handles adding a new guardian
   */
  const handleAddGuardian = useCallback(() => {
    addGuardian({
      firstName: '',
      lastName: '',
      relationship: undefined,
      email: '',
      phone: '',
      isPrimary: false,
      canPickup: false,
      emergencyContact: false
    });
  }, [addGuardian]);

  /**
   * Handles removing a guardian
   */
  const handleRemoveGuardian = useCallback((index: number) => {
    if (guardianFields.length > 1) {
      removeGuardian(index);
    }
  }, [guardianFields.length, removeGuardian]);

  /**
   * Handles adding medical information items
   */
  const handleAddMedicalItem = useCallback((type: 'allergies' | 'medications' | 'medicalConditions', value: string) => {
    if (!value.trim()) return;
    
    const currentItems = form.getValues(`medicalInfo.${type}`) || [];
    form.setValue(`medicalInfo.${type}`, [...currentItems, value.trim()]);
    
    // Clear input
    switch (type) {
      case 'allergies':
        setNewAllergy('');
        break;
      case 'medications':
        setNewMedication('');
        break;
      case 'medicalConditions':
        setNewMedicalCondition('');
        break;
    }
  }, [form]);

  /**
   * Handles removing medical information items
   */
  const handleRemoveMedicalItem = useCallback((type: 'allergies' | 'medications' | 'medicalConditions', index: number) => {
    const currentItems = form.getValues(`medicalInfo.${type}`) || [];
    const newItems = currentItems.filter((_, i) => i !== index);
    form.setValue(`medicalInfo.${type}`, newItems);
  }, [form]);

  /**
   * Handles photo upload
   */
  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setSubmitError('Please select a valid image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setSubmitError('Image file must be less than 5MB');
        return;
      }
      
      form.setValue('photoFile', file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [form]);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(async (data: StudentFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Build request body
      const requestBody = {
        ...data,
        tenantId,
        ...(isEditMode && expectedVersion ? { expectedVersion } : {})
      };
      
      // Determine API endpoint and method
      const endpoint = isEditMode 
        ? `/api/students/${initialData?.id}` 
        : '/api/students';
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Make API request
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': 'current-user' // In a real app, this would come from auth
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (result.success) {
        onSubmit?.(data, result);
      } else {
        setSubmitError(result.error?.message || 'An error occurred while saving the student');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [tenantId, isEditMode, expectedVersion, initialData?.id, onSubmit]);

  /**
   * Renders the current step content
   */
  const renderStepContent = useCallback(() => {
    const stepId = FORM_STEPS[currentStep].id;
    
    switch (stepId) {
      case 'basic':
        return (
          <div className="space-y-6">
            {/* Photo Upload */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                {photoPreview ? (
                  <AvatarImage src={photoPreview} alt="Student photo" />
                ) : (
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-md">
                    <Upload className="h-4 w-4" />
                    <span>Upload Photo</span>
                  </div>
                </Label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Optional. Max 5MB. JPG, PNG, GIF.
                </p>
              </div>
            </div>
            
            {/* Basic Information Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter middle name (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter nationality" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
        
      case 'contact':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter state or province" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address.zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP/Postal Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ZIP or postal code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );
        
      case 'guardians':
        return (
          <div className="space-y-6">
            {guardianFields.map((guardian, index) => (
              <Card key={guardian.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Guardian {index + 1}
                        {form.watch(`guardians.${index}.isPrimary`) && (
                          <Badge variant="default" className="ml-2">Primary</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Parent or guardian information
                      </CardDescription>
                    </div>
                    {guardianFields.length > 1 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Guardian</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this guardian? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveGuardian(index)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.firstName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.lastName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.relationship`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mother">Mother</SelectItem>
                              <SelectItem value="father">Father</SelectItem>
                              <SelectItem value="guardian">Guardian</SelectItem>
                              <SelectItem value="grandparent">Grandparent</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.phone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.isPrimary`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Primary Guardian</FormLabel>
                            <FormDescription>
                              Main contact for school communications
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.canPickup`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Can Pick Up</FormLabel>
                            <FormDescription>
                              Authorized to pick up student
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`guardians.${index}.emergencyContact`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Emergency Contact</FormLabel>
                            <FormDescription>
                              Contact in case of emergency
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {guardianFields.length < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddGuardian}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Guardian
              </Button>
            )}
          </div>
        );
        
      case 'academic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="enrollmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrollment Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expectedGraduationYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Graduation Year *</FormLabel>
                    <FormControl>
                      <Input type="number" min="2024" max="2040" placeholder="e.g., 2028" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="previousSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous School</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter previous school name (optional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Name of the previous school the student attended
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );
        
      case 'medical':
        return (
          <div className="space-y-6">
            {/* Allergies */}
            <div>
              <Label className="text-base font-semibold">Allergies</Label>
              <p className="text-sm text-muted-foreground mb-3">
                List any allergies the student has
              </p>
              
              <div className="flex gap-2 mb-3">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Enter allergy"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMedicalItem('allergies', newAllergy);
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => handleAddMedicalItem('allergies', newAllergy)}
                  disabled={!newAllergy.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {form.watch('medicalInfo.allergies')?.map((allergy, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {allergy}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicalItem('allergies', index)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Medications */}
            <div>
              <Label className="text-base font-semibold">Current Medications</Label>
              <p className="text-sm text-muted-foreground mb-3">
                List any medications the student is currently taking
              </p>
              
              <div className="flex gap-2 mb-3">
                <Input
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="Enter medication"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMedicalItem('medications', newMedication);
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => handleAddMedicalItem('medications', newMedication)}
                  disabled={!newMedication.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {form.watch('medicalInfo.medications')?.map((medication, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {medication}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicalItem('medications', index)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Medical Conditions */}
            <div>
              <Label className="text-base font-semibold">Medical Conditions</Label>
              <p className="text-sm text-muted-foreground mb-3">
                List any medical conditions or health concerns
              </p>
              
              <div className="flex gap-2 mb-3">
                <Input
                  value={newMedicalCondition}
                  onChange={(e) => setNewMedicalCondition(e.target.value)}
                  placeholder="Enter medical condition"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMedicalItem('medicalConditions', newMedicalCondition);
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => handleAddMedicalItem('medicalConditions', newMedicalCondition)}
                  disabled={!newMedicalCondition.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {form.watch('medicalInfo.medicalConditions')?.map((condition, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {condition}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicalItem('medicalConditions', index)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Additional Medical Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="medicalInfo.bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="medicalInfo.emergencyMedicalContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Medical Contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Doctor or hospital contact info" {...field} />
                    </FormControl>
                    <FormDescription>
                      Contact information for student's doctor or preferred hospital
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="medicalInfo.specialNeeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Needs or Accommodations</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe any special needs, accommodations, or important health information..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Please provide details about any special accommodations or support the student requires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about the student..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional additional information that might be helpful for teachers and staff
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      default:
        return null;
    }
  }, [currentStep, form, guardianFields, photoPreview, newAllergy, newMedication, newMedicalCondition, handleAddGuardian, handleRemoveGuardian, handleAddMedicalItem, handleRemoveMedicalItem, handlePhotoUpload]);

  const currentStepConfig = FORM_STEPS[currentStep];
  const progress = getFormProgress();

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <User className="h-5 w-5" />
                    Edit Student
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Add New Student
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isEditMode 
                  ? 'Update student information and details'
                  : 'Create a new student record with complete information'
                }
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{progress}% Complete</div>
              <Progress value={progress} className="w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full border-2 flex items-center justify-center
                      ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                      ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                      ${!isActive && !isCompleted ? 'border-muted-foreground bg-background' : ''}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < FORM_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-border'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentStepConfig.icon className="h-5 w-5" />
                {currentStepConfig.title}
              </CardTitle>
              <CardDescription>{currentStepConfig.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
            
            {/* Error Display */}
            {submitError && (
              <CardContent>
                <div className="flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-destructive">{submitError}</span>
                </div>
              </CardContent>
            )}
            
            {/* Navigation */}
            <CardContent className="flex items-center justify-between pt-6 border-t">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {currentStep < FORM_STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSubmitting}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {isEditMode ? 'Update Student' : 'Create Student'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}