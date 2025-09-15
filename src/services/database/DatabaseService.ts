import { Pool, PoolClient } from 'pg';
import { Config } from '../../core/configuration';
import { AuthorizationRequest } from '../authorization/EnhancedAuthorizationService';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

/**
 * PostgreSQL Database Service
 * Replaces in-memory storage with persistent database storage
 * Solves authorization request persistence issues
 */
export class DatabaseService {
  private pool: Pool;
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
    
    // Get database configuration with proper type handling
    const dbConfig: DatabaseConfig = {
      host: config.get('database.host') || 'localhost',
      port: parseInt(config.get('database.port') || '5432'),
      database: config.get('database.name') || 'sks_rootz_platform',
      username: config.get('database.username') || 'postgres',
      password: config.get('database.password') || 'password',
      ssl: config.get('database.ssl') === 'true',
      maxConnections: parseInt(config.get('database.maxConnections') || '20')
    };
    
    // Create connection pool
    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      max: dbConfig.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    console.log(`📊 Database service initialized: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  }
  
  /**
   * Initialize database (create tables if they don't exist)
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Check if authorization_requests table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'authorization_requests'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('📊 Creating authorization_requests table...');
        
        // Create the table
        await client.query(`
          CREATE TABLE authorization_requests (
            request_id VARCHAR(66) PRIMARY KEY,
            user_address VARCHAR(42) NOT NULL,
            auth_token VARCHAR(66) NOT NULL UNIQUE,
            email_hash VARCHAR(66) NOT NULL,
            attachment_hashes JSONB DEFAULT '[]',
            credit_cost INTEGER NOT NULL DEFAULT 4,
            status VARCHAR(20) NOT NULL DEFAULT 'pending' 
              CHECK (status IN ('pending', 'authorized', 'processed', 'expired', 'cancelled')),
            
            email_sender VARCHAR(255),
            email_subject TEXT,
            attachment_count INTEGER DEFAULT 0,
            ipfs_hash VARCHAR(66),
            email_data JSONB,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // Create indexes
        await client.query(`
          CREATE INDEX idx_auth_requests_user_address ON authorization_requests(user_address);
          CREATE INDEX idx_auth_requests_auth_token ON authorization_requests(auth_token);
          CREATE INDEX idx_auth_requests_status ON authorization_requests(status);
          CREATE INDEX idx_auth_requests_expires_at ON authorization_requests(expires_at);
          CREATE INDEX idx_auth_requests_created_at ON authorization_requests(created_at DESC);
        `);
        
        // Create update trigger
        await client.query(`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ language 'plpgsql';
          
          CREATE TRIGGER update_authorization_requests_updated_at 
              BEFORE UPDATE ON authorization_requests 
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
        
        console.log('✅ Database tables created successfully');
      } else {
        console.log('✅ Database tables already exist');
      }
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Create authorization request in database
   */
  async createAuthorizationRequest(request: AuthorizationRequest): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO authorization_requests (
          request_id, user_address, auth_token, email_hash, attachment_hashes,
          credit_cost, status, email_sender, email_subject, attachment_count,
          ipfs_hash, email_data, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        request.requestId,
        request.userAddress,
        request.authToken,
        request.emailHash,
        JSON.stringify(request.attachmentHashes),
        request.creditCost,
        request.status,
        request.emailSender,
        request.emailSubject,
        request.attachmentCount,
        request.ipfsHash,
        JSON.stringify(request.emailData),
        request.expiresAt
      ]);
      
      console.log(`📊 Authorization request saved to database: ${request.requestId}`);
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Get authorization request by ID
   */
  async getAuthorizationRequest(requestId: string): Promise<AuthorizationRequest | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM authorization_requests 
        WHERE request_id = $1
      `, [requestId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.mapRowToAuthorizationRequest(row);
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Get authorization request by auth token
   */
  async getAuthorizationRequestByToken(authToken: string): Promise<AuthorizationRequest | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM authorization_requests 
        WHERE auth_token = $1
      `, [authToken]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.mapRowToAuthorizationRequest(row);
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Get user's authorization requests
   */
  async getUserRequests(userAddress: string): Promise<AuthorizationRequest[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM authorization_requests 
        WHERE user_address = $1 
        ORDER BY created_at DESC
      `, [userAddress.toLowerCase()]);
      
      return result.rows.map(row => this.mapRowToAuthorizationRequest(row));
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Update authorization request status
   */
  async updateRequestStatus(requestId: string, status: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        UPDATE authorization_requests 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE request_id = $2
      `, [status, requestId]);
      
      console.log(`📊 Request status updated: ${requestId} -> ${status}`);
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Delete authorization request
   */
  async deleteRequest(requestId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        DELETE FROM authorization_requests 
        WHERE request_id = $1
      `, [requestId]);
      
      console.log(`📊 Request deleted: ${requestId}`);
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Clean up expired requests
   */
  async cleanupExpiredRequests(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        DELETE FROM authorization_requests 
        WHERE status = 'pending' 
        AND expires_at < CURRENT_TIMESTAMP
      `);
      
      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log(`📊 Cleaned up ${deletedCount} expired authorization requests`);
      }
      
      return deletedCount;
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Get database statistics
   */
  async getStatistics(): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const stats = await client.query(`
        SELECT 
          status,
          COUNT(*) as count,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM authorization_requests 
        GROUP BY status
      `);
      
      const total = await client.query(`
        SELECT COUNT(*) as total FROM authorization_requests
      `);
      
      return {
        totalRequests: parseInt(total.rows[0].total),
        byStatus: stats.rows,
        poolStats: {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingClients: this.pool.waitingCount
        }
      };
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query('SELECT NOW() as timestamp');
        
        return {
          healthy: true,
          details: {
            connected: true,
            timestamp: result.rows[0].timestamp,
            poolStats: {
              total: this.pool.totalCount,
              idle: this.pool.idleCount,
              waiting: this.pool.waitingCount
            }
          }
        };
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      return {
        healthy: false,
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown database error'
        }
      };
    }
  }
  
  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('📊 Database connections closed');
  }
  
  /**
   * Map database row to AuthorizationRequest object
   * Handles malformed JSON gracefully
   */
  private mapRowToAuthorizationRequest(row: any): AuthorizationRequest {
    try {
      // Safely parse JSONB fields with fallbacks
      let attachmentHashes = [];
      if (row.attachment_hashes) {
        try {
          attachmentHashes = typeof row.attachment_hashes === 'string' 
            ? JSON.parse(row.attachment_hashes) 
            : row.attachment_hashes;
        } catch (e) {
          console.warn(`[DB] Invalid attachment_hashes JSON for request ${row.request_id}:`, e.message);
          attachmentHashes = []; // Fallback to empty array
        }
      }

      let emailData = null;
      if (row.email_data) {
        try {
          emailData = typeof row.email_data === 'string' 
            ? JSON.parse(row.email_data) 
            : row.email_data;
            
          // Fix malformed headers if they exist
          if (emailData && emailData.headers) {
            const headers = emailData.headers;
            // Convert "[object Object]" strings back to reasonable values
            Object.keys(headers).forEach(key => {
              if (headers[key] === "[object Object]") {
                // For email addresses, extract from original fields
                if (key === 'from') {
                  headers[key] = emailData.from || 'unknown@sender.com';
                } else if (key === 'to') {
                  headers[key] = emailData.to ? emailData.to[0] : 'unknown@recipient.com';
                } else {
                  headers[key] = 'unavailable';
                }
              }
            });
          }
        } catch (e) {
          console.warn(`[DB] Invalid email_data JSON for request ${row.request_id}:`, e.message);
          // Create minimal email data from available fields
          emailData = {
            from: row.email_sender || 'unknown@sender.com',
            subject: row.email_subject || 'No subject',
            to: ['process@rivetz.com'],
            headers: {
              from: row.email_sender || 'unknown@sender.com',
              subject: row.email_subject || 'No subject',
              to: 'process@rivetz.com'
            }
          };
        }
      }

      return {
        requestId: row.request_id,
        userAddress: row.user_address,
        authToken: row.auth_token,
        emailHash: row.email_hash,
        attachmentHashes: attachmentHashes,
        creditCost: row.credit_cost,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        status: row.status,
        emailSender: row.email_sender,
        emailSubject: row.email_subject,
        attachmentCount: row.attachment_count || 0,
        ipfsHash: row.ipfs_hash,
        emailData: emailData
      };
    } catch (error) {
      console.error(`[DB] Error mapping authorization request ${row.request_id}:`, error);
      throw new Error(`Failed to map authorization request: ${error.message}`);
    }
  }
}

export default DatabaseService;