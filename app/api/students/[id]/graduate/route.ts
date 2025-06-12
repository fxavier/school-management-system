/**
 * Student Graduation API Route - POST
 * 
 * This module provides a specialized endpoint for graduating students.
 * It implements the graduation business process while maintaining proper
 * validation, audit trails, and business rule enforcement.
 * 
 * Endpoint:
 * - POST /api/students/[id]/graduate - Graduate a student
 * 
 * Architecture Notes:
 * - Implements domain-specific business operation
 * - Enforces graduation eligibility rules
 * - Maintains comprehensive audit trail
 * - Triggers appropriate domain events
 * - Provides detailed graduation summary information
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  GraduateStudentUseCase,
  GraduateStudentRequest,
  GraduateStudentDto
} from '../../../../../application';
import { 
  getPrismaClient,
  PrismaStudentRepository,
  PrismaDomainEventPublisher,
  loadAppConfig 
} from '../../../../../infrastructure';
import { StudentDomainService } from '../../../../../domain/domain-services/student-domain-service';
import { EntityNotFoundError, BusinessRuleViolationError } from '../../../../../shared';

/**
 * Interface for route parameters
 */
interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Request body interface for student graduation
 */
interface GraduateStudentRequestBody {
  /** Graduation date in ISO string format */
  graduationDate: string;
  /** Additional graduation notes (optional) */
  notes?: string;
}

/**
 * Graduates a student
 * 
 * This endpoint handles the complex business process of graduating a student,
 * including validation of eligibility criteria, updating the student status,
 * and triggering appropriate notifications and integrations.
 * 
 * @param request - The Next.js request object
 * @param params - Route parameters containing the student ID
 * @returns Promise resolving to the API response
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Extract tenant ID from headers
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant';
    const performedBy = request.headers.get('x-user-id') || 'system';
    
    // Validate student ID parameter
    if (!params.id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Student ID is required',
            field: 'id'
          }
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body: GraduateStudentRequestBody = await request.json();
    
    // Validate graduation date
    if (!body.graduationDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Graduation date is required',
            field: 'graduationDate'
          }
        },
        { status: 400 }
      );
    }

    // Validate graduation date format
    const graduationDate = new Date(body.graduationDate);
    if (isNaN(graduationDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid graduation date format. Please provide a valid ISO date string.',
            field: 'graduationDate'
          }
        },
        { status: 400 }
      );
    }

    // Validate graduation date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (graduationDate > today) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Graduation date cannot be in the future',
            field: 'graduationDate'
          }
        },
        { status: 400 }
      );
    }

    // Create graduation data DTO
    const graduationData: GraduateStudentDto = {
      studentId: params.id,
      graduationDate: body.graduationDate,
      tenantId
    };

    // Initialize dependencies
    const config = loadAppConfig();
    const prismaClient = getPrismaClient();
    const studentRepository = new PrismaStudentRepository(prismaClient);
    const domainService = new StudentDomainService(studentRepository);
    const eventPublisher = new PrismaDomainEventPublisher(prismaClient);

    // Create use case instance
    const graduateStudentUseCase = new GraduateStudentUseCase(
      studentRepository,
      domainService,
      eventPublisher
    );

    // Execute the use case
    const useCaseRequest: GraduateStudentRequest = {
      graduationData,
      performedBy
    };

    const result = await graduateStudentUseCase.execute(useCaseRequest);

    // Handle the result
    if (result.isSuccess) {
      return NextResponse.json(
        {
          success: true,
          data: {
            student: result.value.student,
            graduationSummary: result.value.graduationSummary
          },
          message: result.value.message,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            processingTimeMs: 0,
            operation: 'graduate_student',
            performedBy
          }
        },
        { status: 200 }
      );
    } else {
      // Determine appropriate HTTP status code based on error type
      let statusCode = 500;
      if (result.error instanceof EntityNotFoundError) {
        statusCode = 404;
      } else if (result.error instanceof BusinessRuleViolationError) {
        statusCode = 422; // Unprocessable Entity
      } else if (result.error.message.includes('validation') || result.error.message.includes('Invalid')) {
        statusCode = 400;
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
            processingTimeMs: 0,
            operation: 'graduate_student'
          }
        },
        { status: statusCode }
      );
    }

  } catch (error) {
    console.error(`Error in POST /api/students/${params.id}/graduate:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while graduating the student',
          details: process.env.NODE_ENV === 'development' ? { error: error.toString() } : {}
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          processingTimeMs: 0,
          operation: 'graduate_student'
        }
      },
      { status: 500 }
    );
  }
}