/**
 * Individual Student API Routes - GET, PUT, DELETE
 * 
 * This module provides RESTful API endpoints for individual student operations.
 * It handles single student retrieval, updates, and deletion while maintaining
 * proper error handling, validation, and audit trails.
 * 
 * Endpoints:
 * - GET /api/students/[id] - Retrieve a student by ID
 * - PUT /api/students/[id] - Update a student
 * - DELETE /api/students/[id] - Delete (soft delete) a student
 * 
 * Architecture Notes:
 * - Implements RESTful conventions with proper HTTP status codes
 * - Supports both UUID and student number as identifiers
 * - Includes optimistic locking for concurrent update protection
 * - Provides comprehensive audit trail for all operations
 * - Maintains multi-tenancy isolation
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  GetStudentUseCase,
  GetStudentRequest,
  UpdateStudentUseCase,
  UpdateStudentRequest,
  UpdateStudentDto
} from '../../../../application';
import { 
  getPrismaClient,
  PrismaStudentRepository,
  PrismaDomainEventPublisher,
  loadAppConfig 
} from '../../../../infrastructure';
import { StudentDomainService } from '../../../../domain/domain-services/student-domain-service';
import { EntityNotFoundError, ConcurrencyError } from '../../../../shared';

/**
 * Interface for route parameters
 */
interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Request body interface for updating a student
 */
interface UpdateStudentRequestBody extends UpdateStudentDto {
  expectedVersion: number; // Required for optimistic locking
}

/**
 * Retrieves a single student by their ID or student number
 * 
 * @param request - The Next.js request object
 * @param params - Route parameters containing the student ID
 * @returns Promise resolving to the API response
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Extract tenant ID from headers
    const tenantId = request.headers.get('x-tenant-id') || 'default-tenant';
    const requestedBy = request.headers.get('x-user-id') || 'system';
    
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

    // Initialize dependencies
    const config = loadAppConfig();
    const prismaClient = getPrismaClient();
    const studentRepository = new PrismaStudentRepository(prismaClient);

    // Create use case instance
    const getStudentUseCase = new GetStudentUseCase(studentRepository);

    // Execute the use case
    const useCaseRequest: GetStudentRequest = {
      studentId: params.id,
      tenantId,
      requestedBy
    };

    const result = await getStudentUseCase.execute(useCaseRequest);

    // Handle the result
    if (result.isSuccess) {
      return NextResponse.json(
        {
          success: true,
          data: result.value.student,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            processingTimeMs: 0
          }
        },
        { status: 200 }
      );
    } else {
      // Determine appropriate HTTP status code
      let statusCode = 500;
      if (result.error instanceof EntityNotFoundError) {
        statusCode = 404;
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
            processingTimeMs: 0
          }
        },
        { status: statusCode }
      );
    }

  } catch (error) {
    console.error(`Error in GET /api/students/${params.id}:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while retrieving the student',
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
 * Updates an existing student
 * 
 * @param request - The Next.js request object
 * @param params - Route parameters containing the student ID
 * @returns Promise resolving to the API response
 */
export async function PUT(
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
    const body: UpdateStudentRequestBody = await request.json();
    
    // Validate expected version for optimistic locking
    if (typeof body.expectedVersion !== 'number' || body.expectedVersion < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Expected version is required and must be a positive number',
            field: 'expectedVersion'
          }
        },
        { status: 400 }
      );
    }

    // Extract update data (exclude expectedVersion from update data)
    const { expectedVersion, ...updateData } = body;

    // Validate that there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field must be provided for update',
            field: 'updateData'
          }
        },
        { status: 400 }
      );
    }

    // Initialize dependencies
    const config = loadAppConfig();
    const prismaClient = getPrismaClient();
    const studentRepository = new PrismaStudentRepository(prismaClient);
    const domainService = new StudentDomainService(studentRepository);
    const eventPublisher = new PrismaDomainEventPublisher(prismaClient);

    // Create use case instance
    const updateStudentUseCase = new UpdateStudentUseCase(
      studentRepository,
      domainService,
      eventPublisher
    );

    // Execute the use case
    const useCaseRequest: UpdateStudentRequest = {
      studentId: params.id,
      updateData,
      expectedVersion,
      tenantId,
      performedBy
    };

    const result = await updateStudentUseCase.execute(useCaseRequest);

    // Handle the result
    if (result.isSuccess) {
      return NextResponse.json(
        {
          success: true,
          data: result.value.student,
          updatedFields: result.value.updatedFields,
          message: result.value.message,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            processingTimeMs: 0
          }
        },
        { status: 200 }
      );
    } else {
      // Determine appropriate HTTP status code
      let statusCode = 500;
      if (result.error instanceof EntityNotFoundError) {
        statusCode = 404;
      } else if (result.error instanceof ConcurrencyError) {
        statusCode = 409; // Conflict
      } else if (result.error.message.includes('validation') || result.error.message.includes('Invalid')) {
        statusCode = 400;
      } else if (result.error.message.includes('already exists') || result.error.message.includes('unique')) {
        statusCode = 409; // Conflict
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
    console.error(`Error in PUT /api/students/${params.id}:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while updating the student',
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
 * Soft deletes a student (marks as deleted without removing from database)
 * 
 * @param request - The Next.js request object
 * @param params - Route parameters containing the student ID
 * @returns Promise resolving to the API response
 */
export async function DELETE(
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

    // Initialize dependencies
    const config = loadAppConfig();
    const prismaClient = getPrismaClient();
    const studentRepository = new PrismaStudentRepository(prismaClient);

    // Perform soft delete
    await studentRepository.delete(params.id, tenantId);

    return NextResponse.json(
      {
        success: true,
        message: `Student with ID ${params.id} has been successfully deleted`,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          processingTimeMs: 0,
          operation: 'soft_delete',
          performedBy
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error in DELETE /api/students/${params.id}:`, error);
    
    // Determine appropriate HTTP status code based on error type
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred while deleting the student';

    if (error instanceof EntityNotFoundError) {
      statusCode = 404;
      errorCode = 'ENTITY_NOT_FOUND';
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? { error: error.toString() } : {}
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
}