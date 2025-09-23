import mysql from 'mysql2/promise';

export class MySQLService {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  /**
   * Initialize MySQL connection pool for OCI
   */
  async initialize() {
    try {
      // OCI MySQL Configuration
      const dbConfig = {
        host: this.config.get('database.host') || 'mysql.sub07192123581.rootzvcn.oraclevcn.com',
        port: parseInt(this.config.get('database.port') || '3306'),
        user: this.config.get('database.username') || 'admin',
        password: this.config.get('database.password'),
        database: this.config.get('database.name') || 'rootz_platform',
        ssl: {
          rejectUnauthorized: false
        },
        connectionLimit: parseInt(this.config.get('database.maxConnections') || '10'),
        acquireTimeout: 60000,
        timeout: 60000,
      };

      // Create connection pool
      this.pool = mysql.createPool(dbConfig);

      // Test connection
      const connection = await this.pool.getConnection();
      console.log(`✅ MySQL connected to OCI database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
      connection.release();

      // Initialize tables
      await this.initializeTables();

    } catch (error) {
      console.error('❌ MySQL connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize database tables for email wallet system
   */
  async initializeTables() {
    try {
      // Create authorization_requests table
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS authorization_requests (
          request_id VARCHAR(66) PRIMARY KEY,
          user_address VARCHAR(42) NOT NULL,
          auth_token VARCHAR(66) NOT NULL UNIQUE,
          email_hash VARCHAR(66) NOT NULL,
          attachment_hashes JSON DEFAULT ('[]'),
          credit_cost INT NOT NULL DEFAULT 4,
          status ENUM('pending', 'authorized', 'processed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
          
          email_sender VARCHAR(255),
          email_subject TEXT,
          attachment_count INT DEFAULT 0,
          ipfs_hash VARCHAR(66),
          email_data JSON,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_auth_user_address (user_address),
          INDEX idx_auth_token (auth_token),
          INDEX idx_auth_status (status),
          INDEX idx_auth_expires (expires_at),
          INDEX idx_auth_created (created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create email_wallets table
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS email_wallets (
          wallet_id VARCHAR(66) PRIMARY KEY,
          user_address VARCHAR(42) NOT NULL,
          email_hash VARCHAR(66) NOT NULL,
          ipfs_hash VARCHAR(66),
          transaction_hash VARCHAR(66),
          status ENUM('pending', 'minted', 'failed') NOT NULL DEFAULT 'pending',
          
          email_sender VARCHAR(255),
          email_subject TEXT,
          email_content_preview TEXT,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_wallet_user (user_address),
          INDEX idx_wallet_email (email_hash),
          INDEX idx_wallet_status (status),
          INDEX idx_wallet_created (created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create users table for tracking credits
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
          user_address VARCHAR(42) PRIMARY KEY,
          credits INT NOT NULL DEFAULT 60,
          email_count INT DEFAULT 0,
          total_spent INT DEFAULT 0,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_users_credits (credits),
          INDEX idx_users_created (created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ MySQL tables initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize MySQL tables:', error);
      throw error;
    }
  }

  /**
   * Create authorization request
   */
  async createAuthorizationRequest(request) {
    try {
      const [result] = await this.pool.execute(`
        INSERT INTO authorization_requests (
          request_id, user_address, auth_token, email_hash, attachment_hashes,
          credit_cost, status, email_sender, email_subject, attachment_count,
          ipfs_hash, email_data, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        request.requestId,
        request.userAddress,
        request.authToken,
        request.emailHash,
        JSON.stringify(request.attachmentHashes || []),
        request.creditCost,
        request.status,
        request.emailSender,
        request.emailSubject,
        request.attachmentCount || 0,
        request.ipfsHash,
        JSON.stringify(request.emailData || {}),
        request.expiresAt
      ]);

      console.log(`📊 Authorization request saved to MySQL: ${request.requestId}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to create authorization request:', error);
      throw error;
    }
  }

  /**
   * Get authorization request by ID
   */
  async getAuthorizationRequest(requestId) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT * FROM authorization_requests WHERE request_id = ?
      `, [requestId]);

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToAuthorizationRequest(rows[0]);

    } catch (error) {
      console.error('❌ Failed to get authorization request:', error);
      throw error;
    }
  }

  /**
   * Get authorization request by auth token
   */
  async getAuthorizationRequestByToken(authToken) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT * FROM authorization_requests WHERE auth_token = ?
      `, [authToken]);

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToAuthorizationRequest(rows[0]);

    } catch (error) {
      console.error('❌ Failed to get authorization request by token:', error);
      throw error;
    }
  }

  /**
   * Update authorization request status
   */
  async updateRequestStatus(requestId, status) {
    try {
      const [result] = await this.pool.execute(`
        UPDATE authorization_requests 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE request_id = ?
      `, [status, requestId]);

      console.log(`📊 Request status updated: ${requestId} -> ${status}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to update request status:', error);
      throw error;
    }
  }

  /**
   * Get user's authorization requests
   */
  async getUserRequests(userAddress) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT * FROM authorization_requests 
        WHERE LOWER(user_address) = LOWER(?) 
        ORDER BY created_at DESC
      `, [userAddress]);

      return rows.map(row => this.mapRowToAuthorizationRequest(row));

    } catch (error) {
      console.error('❌ Failed to get user requests:', error);
      throw error;
    }
  }

  /**
   * Clean up expired requests
   */
  async cleanupExpiredRequests() {
    try {
      const [result] = await this.pool.execute(`
        DELETE FROM authorization_requests 
        WHERE status = 'pending' 
        AND expires_at < NOW()
      `);

      const deletedCount = result.affectedRows || 0;
      if (deletedCount > 0) {
        console.log(`📊 Cleaned up ${deletedCount} expired authorization requests`);
      }

      return deletedCount;

    } catch (error) {
      console.error('❌ Failed to cleanup expired requests:', error);
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      const [rows] = await this.pool.execute('SELECT NOW() as timestamp');
      
      return {
        healthy: true,
        details: {
          connected: true,
          timestamp: rows[0].timestamp,
          database: 'mysql'
        }
      };

    } catch (error) {
      return {
        healthy: false,
        details: {
          connected: false,
          error: error.message,
          database: 'mysql'
        }
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    try {
      const [stats] = await this.pool.execute(`
        SELECT 
          status,
          COUNT(*) as count,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM authorization_requests 
        GROUP BY status
      `);

      const [total] = await this.pool.execute(`
        SELECT COUNT(*) as total FROM authorization_requests
      `);

      return {
        totalRequests: total[0].total,
        byStatus: stats
      };

    } catch (error) {
      console.error('❌ Failed to get database statistics:', error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('📊 MySQL connections closed');
    }
  }

  /**
   * Map database row to AuthorizationRequest object
   */
  mapRowToAuthorizationRequest(row) {
    try {
      let attachmentHashes = [];
      if (row.attachment_hashes) {
        try {
          attachmentHashes = typeof row.attachment_hashes === 'string' 
            ? JSON.parse(row.attachment_hashes) 
            : row.attachment_hashes;
        } catch (e) {
          console.warn(`Invalid attachment_hashes JSON for request ${row.request_id}`);
          attachmentHashes = [];
        }
      }

      let emailData = null;
      if (row.email_data) {
        try {
          emailData = typeof row.email_data === 'string' 
            ? JSON.parse(row.email_data) 
            : row.email_data;
        } catch (e) {
          console.warn(`Invalid email_data JSON for request ${row.request_id}`);
          emailData = {
            from: row.email_sender || 'unknown@sender.com',
            subject: row.email_subject || 'No subject',
            to: ['process@rootz.global']
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
      console.error(`Error mapping authorization request ${row.request_id}:`, error);
      throw new Error(`Failed to map authorization request: ${error.message}`);
    }
  }
}

export default MySQLService;