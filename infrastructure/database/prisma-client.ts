/**
 * Prisma Client Configuration and Setup
 * 
 * This module provides a centralized configuration for the Prisma database client.
 * It implements the Singleton pattern to ensure a single database connection
 * throughout the application lifecycle and provides proper error handling,
 * logging, and connection management.
 * 
 * Key Features:
 * - Singleton pattern for connection management
 * - Environment-based configuration
 * - Connection pooling optimization
 * - Comprehensive error handling
 * - Query logging and performance monitoring
 * - Graceful shutdown handling
 * - Transaction support utilities
 * 
 * Architecture Notes:
 * - Integrates with Next.js hot reloading in development
 * - Provides connection health monitoring
 * - Supports connection retry mechanisms
 * - Implements proper resource cleanup
 */

import { PrismaClient } from '@prisma/client';

/**
 * Prisma client configuration options
 */
interface PrismaConfig {
  /** Database connection URL */
  databaseUrl: string;
  /** Enable query logging */
  enableLogging: boolean;
  /** Log level for database queries */
  logLevel: 'info' | 'query' | 'warn' | 'error';
  /** Connection timeout in milliseconds */
  connectionTimeoutMs: number;
  /** Maximum number of connections in the pool */
  maxConnections: number;
  /** Enable error formatting */
  enableErrorFormatting: boolean;
}

/**
 * Default configuration based on environment
 */
const getDefaultConfig = (): PrismaConfig => ({
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/school_management',
  enableLogging: process.env.NODE_ENV === 'development',
  logLevel: (process.env.PRISMA_LOG_LEVEL as any) || 'info',
  connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  enableErrorFormatting: process.env.NODE_ENV === 'development',
});

/**
 * Global variable to store the Prisma client instance
 * This ensures we maintain a single connection across the application
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Database Client Singleton
 * 
 * Provides a centralized, configured Prisma client instance.
 * Implements proper connection management and error handling.
 */
class DatabaseClient {
  private static instance: DatabaseClient;
  private prismaClient: PrismaClient;
  private config: PrismaConfig;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  /**
   * Private constructor to enforce singleton pattern
   * 
   * @param config - Database configuration options
   */
  private constructor(config: PrismaConfig) {
    this.config = config;
    this.prismaClient = this.createPrismaClient();
    this.setupEventHandlers();
  }

  /**
   * Gets the singleton instance of the database client
   * 
   * @param config - Optional configuration override
   * @returns DatabaseClient instance
   */
  public static getInstance(config?: Partial<PrismaConfig>): DatabaseClient {
    if (!DatabaseClient.instance) {
      const defaultConfig = getDefaultConfig();
      const finalConfig = { ...defaultConfig, ...config };
      DatabaseClient.instance = new DatabaseClient(finalConfig);
    }
    return DatabaseClient.instance;
  }

  /**
   * Gets the Prisma client instance
   * 
   * @returns Configured PrismaClient instance
   */
  public getClient(): PrismaClient {
    return this.prismaClient;
  }

  /**
   * Connects to the database
   * Implements connection retry logic and proper error handling
   * 
   * @returns Promise that resolves when connection is established
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  /**
   * Disconnects from the database
   * Ensures proper cleanup of resources
   * 
   * @returns Promise that resolves when disconnection is complete
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.prismaClient.$disconnect();
      this.isConnected = false;
      this.connectionPromise = null;

      if (this.config.enableLogging) {
        console.log('🔌 Database disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Checks the health of the database connection
   * 
   * @returns Promise resolving to connection health status
   */
  public async healthCheck(): Promise<{
    connected: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Simple query to test connection
      await this.prismaClient.$queryRaw`SELECT 1 as health_check`;
      
      const latencyMs = Date.now() - startTime;

      return {
        connected: true,
        latencyMs
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Executes a function within a database transaction
   * Provides a clean interface for transaction management
   * 
   * @param fn - Function to execute within the transaction
   * @returns Promise resolving to the function result
   */
  public async executeInTransaction<T>(
    fn: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.prismaClient.$transaction(fn);
  }

  /**
   * Gets database connection statistics
   * 
   * @returns Promise resolving to connection statistics
   */
  public async getConnectionStats(): Promise<{
    activeConnections: number;
    maxConnections: number;
    connectionPoolSize: number;
  }> {
    try {
      // Query database connection information
      const result = await this.prismaClient.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active'
      `;

      return {
        activeConnections: Number(result[0]?.count || 0),
        maxConnections: this.config.maxConnections,
        connectionPoolSize: this.config.maxConnections
      };
    } catch (error) {
      if (this.config.enableLogging) {
        console.warn('Could not retrieve connection stats:', error);
      }
      
      return {
        activeConnections: -1,
        maxConnections: this.config.maxConnections,
        connectionPoolSize: this.config.maxConnections
      };
    }
  }

  /**
   * Creates and configures the Prisma client instance
   * 
   * @returns Configured PrismaClient
   */
  private createPrismaClient(): PrismaClient {
    const logConfig = this.config.enableLogging ? [
      {
        emit: 'event' as const,
        level: this.config.logLevel as any
      }
    ] : undefined;

    return new PrismaClient({
      datasources: {
        db: {
          url: this.config.databaseUrl
        }
      },
      log: logConfig,
      errorFormat: this.config.enableErrorFormatting ? 'pretty' : 'minimal',
    });
  }

  /**
   * Sets up event handlers for the Prisma client
   * Configures logging, error handling, and monitoring
   */
  private setupEventHandlers(): void {
    if (!this.config.enableLogging) {
      return;
    }

    // Log queries in development
    this.prismaClient.$on('query', (e) => {
      console.log(`🔍 Query: ${e.query}`);
      console.log(`📊 Params: ${e.params}`);
      console.log(`⏱️  Duration: ${e.duration}ms`);
    });

    // Log warnings
    this.prismaClient.$on('warn', (e) => {
      console.warn('⚠️  Prisma Warning:', e);
    });

    // Log info messages
    this.prismaClient.$on('info', (e) => {
      console.info('ℹ️  Prisma Info:', e);
    });

    // Log errors
    this.prismaClient.$on('error', (e) => {
      console.error('❌ Prisma Error:', e);
    });
  }

  /**
   * Establishes the database connection with retry logic
   * 
   * @returns Promise that resolves when connection is established
   */
  private async establishConnection(): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Test the connection
        await this.prismaClient.$connect();
        
        // Verify with a simple query
        await this.prismaClient.$queryRaw`SELECT 1`;
        
        this.isConnected = true;

        if (this.config.enableLogging) {
          console.log('✅ Database connected successfully');
          console.log(`🔗 Connection URL: ${this.config.databaseUrl.replace(/\/\/.*@/, '//***:***@')}`);
        }

        return;

      } catch (error) {
        retryCount++;
        
        if (this.config.enableLogging) {
          console.error(`❌ Database connection attempt ${retryCount}/${maxRetries} failed:`, error);
        }

        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error}`);
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

/**
 * Gets a configured Prisma client instance
 * Uses the singleton pattern to ensure consistent connection management
 * 
 * @param config - Optional configuration override
 * @returns PrismaClient instance
 */
export function getPrismaClient(config?: Partial<PrismaConfig>): PrismaClient {
  // In development, store the client on the global object to prevent
  // creating multiple instances during hot reloading
  if (process.env.NODE_ENV === 'development') {
    if (!global.__prisma) {
      const dbClient = DatabaseClient.getInstance(config);
      global.__prisma = dbClient.getClient();
    }
    return global.__prisma;
  }

  // In production, always use the singleton instance
  const dbClient = DatabaseClient.getInstance(config);
  return dbClient.getClient();
}

/**
 * Gets the database client singleton instance
 * Provides access to additional client management features
 * 
 * @param config - Optional configuration override
 * @returns DatabaseClient instance
 */
export function getDatabaseClient(config?: Partial<PrismaConfig>): DatabaseClient {
  return DatabaseClient.getInstance(config);
}

/**
 * Executes a function within a database transaction
 * Convenience function for transaction management
 * 
 * @param fn - Function to execute within the transaction
 * @returns Promise resolving to the function result
 */
export async function executeInTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  return client.$transaction(fn);
}

/**
 * Performs a database health check
 * 
 * @returns Promise resolving to health check results
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const dbClient = getDatabaseClient();
  return dbClient.healthCheck();
}

// Default export for convenience
export default getPrismaClient;