/**
 * Students API Routes - POST and GET
 * 
 * This module provides RESTful API endpoints for student management operations.
 * It follows Next.js 13+ App Router conventions and implements proper error handling,
 * request validation, and response formatting.
 * 
 * Endpoints:
 * - POST /api/students - Create a new student
 * - GET /api/students - Search/list students with pagination and filtering
 * 
 * Architecture Notes:
 * - Uses Clean Architecture principles with clear separation of concerns
 * - Implements dependency injection for use cases
 * - Provides comprehensive error handling and HTTP status codes
 * - Supports multi-tenancy through request headers
 * - Includes request/response validation and logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  CreateStudentUseCase,
  CreateStudentRequest,
  SearchStudentsUseCase,
  SearchStudentsRequest,
  CreateStudentDto,
  StudentSearchDto
} from '../../../application';
import { 
  getPrismaClient,
  PrismaStudentRepository,
  PrismaDomainEventPublisher,
  loadAppConfig 
} from '../../../infrastructure';
import { StudentDomainService } from '../../../domain/domain-services/student-domain-service';

/**
 * Request body interface for creating a student
 */
interface CreateStudentRequestBody extends CreateStudentDto {
  // Additional API-specific fields can be added here
}

/**
 * Query parameters interface for searching students
 */
interface SearchStudentsQuery {
  // Search filters
  firstName?: string;
  lastName?: string;
  status?: string;
  enrollmentYear?: string;
  graduationYear?: string;
  grade?: string;
  hasAllergies?: string;
  hasMedicalConditions?: string;
  
  // Age range
  minAge?: string;
  maxAge?: string;
  
  // Pagination
  page?: string;
  limit?: string;
  
  // Sorting
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Creates a new student
 * 
 * @param request - The Next.js request object
 * @returns Promise resolving to the API response
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract tenant ID from headers (in a real app, this would come from authentication)
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant';
    const performedBy = request.headers.get('x-user-id') || 'system';
    
    // Parse and validate request body
    const body: CreateStudentRequestBody = await request.json();
    
    // Validate required fields
    if (!body.firstName?.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'First name is required',
            field: 'firstName' 
          } 
        },
        { status: 400 }
      );
    }
    
    if (!body.lastName?.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Last name is required',
            field: 'lastName' 
          } 
        },
        { status: 400 }
      );
    }
    
    if (!body.dateOfBirth) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Date of birth is required',
            field: 'dateOfBirth' 
          } 
        },
        { status: 400 }
      );
    }
    
    if (!body.guardians || body.guardians.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'At least one guardian is required',
            field: 'guardians' 
          } 
        },
        { status: 400 }
      );
    }

    // Set tenant ID in the request body
    const studentData: CreateStudentDto = {
      ...body,
      tenantId
    };

    // Initialize dependencies
    const config = loadAppConfig();
    const prismaClient = getPrismaClient();
    const studentRepository = new PrismaStudentRepository(prismaClient);
    const domainService = new StudentDomainService(studentRepository);
    const eventPublisher = new PrismaDomainEventPublisher(prismaClient);

    // Create use case instance
    const createStudentUseCase = new CreateStudentUseCase(
      studentRepository,
      domainService,
      eventPublisher
    );

    // Execute the use case
    const useCaseRequest: CreateStudentRequest = {
      studentData,
      performedBy
    };

    const result = await createStudentUseCase.execute(useCaseRequest);

    // Handle the result
    if (result.isSuccess) {
      return NextResponse.json(
        {
          success: true,
          data: result.value.student,
          message: result.value.message,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            processingTimeMs: 0 // Would be calculated in a real implementation
          }
        },
        { status: 201 }
      );
    } else {
      // Determine appropriate HTTP status code based on error type
      let statusCode = 500;
      if (result.error.message.includes('already exists') || result.error.message.includes('unique')) {
        statusCode = 409; // Conflict
      } else if (result.error.message.includes('validation') || result.error.message.includes('required')) {
        statusCode = 400; // Bad Request
      } else if (result.error.message.includes('unauthorized')) {
        statusCode = 403; // Forbidden
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error.constructor.name.replace('Error', '').toUpperCase(),
            message: result.error.message,
            details: (result.error as any).details || {}
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            processingTimeMs: 0
          }
        },
        { status: statusCode }
      );
    }

  } catch (error) {
    console.error('Error in POST /api/students:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while creating the student',
          details: process.env.NODE_ENV === 'development' ? { error: error.toString() } : {}
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          processingTimeMs: 0
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Searches for students with optional filtering and pagination
 * 
 * @param request - The Next.js request object
 * @returns Promise resolving to the API response
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract tenant ID from headers
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant';
    const requestedBy = request.headers.get('x-user-id') || 'system';
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query: SearchStudentsQuery = {
      firstName: searchParams.get('firstName') || undefined,
      lastName: searchParams.get('lastName') || undefined,
      status: searchParams.get('status') || undefined,
      enrollmentYear: searchParams.get('enrollmentYear') || undefined,
      graduationYear: searchParams.get('graduationYear') || undefined,
      grade: searchParams.get('grade') || undefined,
      hasAllergies: searchParams.get('hasAllergies') || undefined,
      hasMedicalConditions: searchParams.get('hasMedicalConditions') || undefined,
      minAge: searchParams.get('minAge') || undefined,
      maxAge: searchParams.get('maxAge') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    // Build search criteria
    const searchCriteria: StudentSearchDto = {
      firstName: query.firstName,
      lastName: query.lastName,
      status: query.status,
      enrollmentYear: query.enrollmentYear ? parseInt(query.enrollmentYear) : undefined,
      graduationYear: query.graduationYear ? parseInt(query.graduationYear) : undefined,
      grade: query.grade,
      hasAllergies: query.hasAllergies === 'true' ? true : query.hasAllergies === 'false' ? false : undefined,
      hasMedicalConditions: query.hasMedicalConditions === 'true' ? true : query.hasMedicalConditions === 'false' ? false : undefined,
      ageRange: query.minAge || query.maxAge ? {
        min: query.minAge ? parseInt(query.minAge) : 0,
        max: query.maxAge ? parseInt(query.maxAge) : 100
      } : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: Math.min(query.limit ? parseInt(query.limit) : 20, 100), // Cap at 100
      sortBy: query.sortBy as any || 'lastName',
      sortOrder: (query.sortOrder as any) || 'asc',
      tenantId
    };

    // Validate pagination parameters
    if (searchCriteria.page && searchCriteria.page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Page must be a positive integer',
            field: 'page'
          }
        },
        { status: 400 }
      );
    }

    if (searchCriteria.limit && (searchCriteria.limit < 1 || searchCriteria.limit > 100)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 100',
            field: 'limit'
          }
        },
        { status: 400 }
      );
    }

    // Initialize dependencies
    const config = loadAppConfig();
    const prismaClient = getPrismaClient();
    const studentRepository = new PrismaStudentRepository(prismaClient);

    // Create use case instance
    const searchStudentsUseCase = new SearchStudentsUseCase(studentRepository);

    // Execute the use case
    const useCaseRequest: SearchStudentsRequest = {
      searchCriteria,
      requestedBy
    };

    const result = await searchStudentsUseCase.execute(useCaseRequest);

    // Handle the result
    if (result.isSuccess) {
      return NextResponse.json(
        {
          success: true,
          data: result.value.result,
          summary: result.value.summary,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            processingTimeMs: result.value.summary.executionTimeMs
          }
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error.constructor.name.replace('Error', '').toUpperCase(),
            message: result.error.message,
            details: (result.error as any).details || {}
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            processingTimeMs: 0
          }
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in GET /api/students:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while searching students',
          details: process.env.NODE_ENV === 'development' ? { error: error.toString() } : {}
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          processingTimeMs: 0
        }
      },
      { status: 500 }
    );
  }
}