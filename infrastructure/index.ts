/**
 * Infrastructure Layer Exports
 * 
 * This file provides a clean interface for accessing all infrastructure layer components.
 * The infrastructure layer contains implementations of external concerns like databases,
 * file systems, external APIs, and other technical details that the application layer
 * depends on through ports (interfaces).
 * 
 * Key Components:
 * - Repository Implementations: Concrete implementations of domain repository interfaces
 * - External Service Adapters: Implementations of application ports for external services
 * - Database Configuration: Prisma client setup and connection management
 * - Event Publishing: Domain event publisher implementations
 * - Configuration Management: Environment-based configuration loading
 * 
 * Architecture Notes:
 * - All exports implement interfaces defined in domain or application layers
 * - Provides concrete implementations for dependency injection
 * - Handles all external system integrations
 * - Maintains clear separation from business logic
 */

// ============================================================================
// Database Infrastructure
// ============================================================================

export * from './database/prisma-client';

// ============================================================================
// Repository Implementations
// ============================================================================

export * from './repositories/prisma-student-repository';

// ============================================================================
// External Service Adapters
// ============================================================================

export * from './adapters/prisma-domain-event-publisher';

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Application configuration loaded from environment variables
 * Provides type-safe access to all configuration values
 */
export interface AppConfig {
  /** Database configuration */
  database: {
    url: string;
    maxConnections: number;
    connectionTimeoutMs: number;
    enableLogging: boolean;
  };
  
  /** Server configuration */
  server: {
    port: number;
    host: string;
    nodeEnv: 'development' | 'production' | 'test';
  };
  
  /** Authentication configuration */
  auth: {
    secretKey: string;
    tokenExpirationMs: number;
    refreshTokenExpirationMs: number;
  };
  
  /** External service configuration */
  services: {
    emailService: {
      apiKey: string;
      fromAddress: string;
      enabled: boolean;
    };
    fileStorage: {
      provider: 'local' | 's3' | 'azure';
      config: Record<string, any>;
    };
  };
  
  /** Feature flags */
  features: {
    enableEventSourcing: boolean;
    enableCaching: boolean;
    enableMetrics: boolean;
    enableRateLimiting: boolean;
  };
  
  /** Monitoring and logging */
  monitoring: {
    enableStructuredLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enablePerformanceMetrics: boolean;
  };
}

/**
 * Loads and validates application configuration from environment variables
 * 
 * @returns Validated application configuration
 * @throws Error if required configuration is missing or invalid
 */
export function loadAppConfig(): AppConfig {
  // Validate required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'AUTH_SECRET_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    database: {
      url: process.env.DATABASE_URL!,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      enableLogging: process.env.DB_ENABLE_LOGGING === 'true' || process.env.NODE_ENV === 'development',
    },
    
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
    },
    
    auth: {
      secretKey: process.env.AUTH_SECRET_KEY!,
      tokenExpirationMs: parseInt(process.env.AUTH_TOKEN_EXPIRATION || '3600000'), // 1 hour
      refreshTokenExpirationMs: parseInt(process.env.AUTH_REFRESH_TOKEN_EXPIRATION || '604800000'), // 7 days
    },
    
    services: {
      emailService: {
        apiKey: process.env.EMAIL_SERVICE_API_KEY || '',
        fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@school.com',
        enabled: process.env.EMAIL_SERVICE_ENABLED === 'true',
      },
      fileStorage: {
        provider: (process.env.FILE_STORAGE_PROVIDER as any) || 'local',
        config: {
          // Local storage config
          uploadPath: process.env.UPLOAD_PATH || './uploads',
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
          
          // S3 config
          s3BucketName: process.env.S3_BUCKET_NAME,
          s3Region: process.env.S3_REGION,
          s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
          s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          
          // Azure config
          azureConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
          azureContainerName: process.env.AZURE_CONTAINER_NAME,
        }
      }
    },
    
    features: {
      enableEventSourcing: process.env.ENABLE_EVENT_SOURCING === 'true',
      enableCaching: process.env.ENABLE_CACHING === 'true',
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    },
    
    monitoring: {
      enableStructuredLogging: process.env.ENABLE_STRUCTURED_LOGGING === 'true',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      enablePerformanceMetrics: process.env.ENABLE_PERFORMANCE_METRICS === 'true',
    }
  };
}

/**
 * Validates the application configuration
 * Checks for logical consistency and proper value ranges
 * 
 * @param config - The configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateAppConfig(config: AppConfig): void {
  // Validate database configuration
  if (config.database.maxConnections < 1 || config.database.maxConnections > 100) {
    throw new Error('Database max connections must be between 1 and 100');
  }
  
  if (config.database.connectionTimeoutMs < 1000 || config.database.connectionTimeoutMs > 60000) {
    throw new Error('Database connection timeout must be between 1000ms and 60000ms');
  }

  // Validate server configuration
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error('Server port must be between 1 and 65535');
  }

  // Validate authentication configuration
  if (config.auth.secretKey.length < 32) {
    throw new Error('Auth secret key must be at least 32 characters long');
  }
  
  if (config.auth.tokenExpirationMs < 60000) { // Minimum 1 minute
    throw new Error('Token expiration must be at least 60000ms (1 minute)');
  }

  // Validate file storage configuration
  const validStorageProviders = ['local', 's3', 'azure'];
  if (!validStorageProviders.includes(config.services.fileStorage.provider)) {
    throw new Error(`File storage provider must be one of: ${validStorageProviders.join(', ')}`);
  }

  // Validate S3 configuration if S3 is selected
  if (config.services.fileStorage.provider === 's3') {
    const s3Config = config.services.fileStorage.config;
    if (!s3Config.s3BucketName || !s3Config.s3Region) {
      throw new Error('S3 bucket name and region are required when using S3 storage');
    }
  }

  // Validate Azure configuration if Azure is selected
  if (config.services.fileStorage.provider === 'azure') {
    const azureConfig = config.services.fileStorage.config;
    if (!azureConfig.azureConnectionString || !azureConfig.azureContainerName) {
      throw new Error('Azure connection string and container name are required when using Azure storage');
    }
  }

  // Validate monitoring configuration
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.monitoring.logLevel)) {
    throw new Error(`Log level must be one of: ${validLogLevels.join(', ')}`);
  }
}

/**
 * Creates a dependency injection container configuration
 * Maps interfaces to their concrete implementations
 * 
 * @param config - Application configuration
 * @returns Dependency injection configuration
 */
export function createDependencyConfig(config: AppConfig) {
  const prismaClient = require('./database/prisma-client').getPrismaClient({
    databaseUrl: config.database.url,
    maxConnections: config.database.maxConnections,
    connectionTimeoutMs: config.database.connectionTimeoutMs,
    enableLogging: config.database.enableLogging,
  });

  return {
    // Database client
    prismaClient,
    
    // Repository implementations
    studentRepository: new (require('./repositories/prisma-student-repository').PrismaStudentRepository)(prismaClient),
    
    // External service adapters
    domainEventPublisher: new (require('./adapters/prisma-domain-event-publisher').PrismaDomainEventPublisher)(
      prismaClient,
      {
        enableLogging: config.monitoring.enableStructuredLogging,
        maxRetries: 3,
        baseBackoffMs: 1000,
        processingIntervalMs: 5000,
      }
    ),
    
    // Configuration
    config,
  };
}

/**
 * Initializes the infrastructure layer
 * Sets up database connections, starts background services, etc.
 * 
 * @param config - Application configuration
 * @returns Promise that resolves when infrastructure is ready
 */
export async function initializeInfrastructure(config: AppConfig): Promise<void> {
  console.log('🚀 Initializing infrastructure...');
  
  try {
    // Validate configuration
    validateAppConfig(config);
    console.log('✅ Configuration validated');
    
    // Initialize database connection
    const dbClient = require('./database/prisma-client').getDatabaseClient({
      databaseUrl: config.database.url,
      maxConnections: config.database.maxConnections,
      connectionTimeoutMs: config.database.connectionTimeoutMs,
      enableLogging: config.database.enableLogging,
    });
    
    await dbClient.connect();
    console.log('✅ Database connected');
    
    // Perform health check
    const healthCheck = await dbClient.healthCheck();
    if (!healthCheck.connected) {
      throw new Error(`Database health check failed: ${healthCheck.error}`);
    }
    console.log(`✅ Database health check passed (${healthCheck.latencyMs}ms)`);
    
    // Initialize domain event publisher if event sourcing is enabled
    if (config.features.enableEventSourcing) {
      const dependencyConfig = createDependencyConfig(config);
      await dependencyConfig.domainEventPublisher.start();
      console.log('✅ Domain event publisher started');
    }
    
    console.log('🎉 Infrastructure initialization complete');
    
  } catch (error) {
    console.error('❌ Infrastructure initialization failed:', error);
    throw error;
  }
}

/**
 * Gracefully shuts down the infrastructure
 * Closes database connections, stops background services, etc.
 * 
 * @param config - Application configuration
 * @returns Promise that resolves when shutdown is complete
 */
export async function shutdownInfrastructure(config: AppConfig): Promise<void> {
  console.log('🛑 Shutting down infrastructure...');
  
  try {
    // Stop domain event publisher if running
    if (config.features.enableEventSourcing) {
      const dependencyConfig = createDependencyConfig(config);
      await dependencyConfig.domainEventPublisher.stop();
      console.log('✅ Domain event publisher stopped');
    }
    
    // Disconnect from database
    const dbClient = require('./database/prisma-client').getDatabaseClient();
    await dbClient.disconnect();
    console.log('✅ Database disconnected');
    
    console.log('🎉 Infrastructure shutdown complete');
    
  } catch (error) {
    console.error('❌ Infrastructure shutdown failed:', error);
    throw error;
  }
}