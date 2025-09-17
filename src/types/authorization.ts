/**
 * Authorization System TypeScript Definitions
 * 
 * Complete type definitions for the email wallet authorization system.
 * Ensures type safety across all components.
 */

// Core authorization request types
export interface AuthorizationRequestData {
  requestId: string;
  userAddress: string;
  emailSubject: string;
  emailSender: string;
  emailHash: string;
  attachmentCount: number;
  attachmentHashes: string[];
  creditCost: number;
  authToken: string;
  status: AuthorizationStatus;
  createdAt: Date;
  expiresAt: Date;
  ipfsHash?: string;
  metadata?: AuthorizationMetadata;
}

export interface AuthorizationRequestCreateData {
  userAddress: string;
  emailSubject: string;
  emailSender: string;
  emailHash: string;
  attachmentCount?: number;
  attachmentHashes?: string[];
  ipfsHash?: string;
  metadata?: any;
}

export type AuthorizationStatus = 
  | 'pending' 
  | 'authorized' 
  | 'rejected' 
  | 'expired' 
  | 'processed';

export interface AuthorizationMetadata {
  processedAt?: string;
  authorizedAt?: string;
  rejectedAt?: string;
  signature?: string;
  walletId?: string;
  transactionHash?: string;
  rawEmailData?: any;
  [key: string]: any;
}

// API request/response types
export interface CreateAuthorizationRequestBody {
  userAddress: string;
  emailSubject: string;
  emailSender: string;
  emailHash: string;
  attachmentCount?: number;
  attachmentHashes?: string[];
  ipfsHash?: string;
  metadata?: any;
}

export interface AuthorizeRequestBody {
  requestId: string;
  userAddress: string;
  signature: string;
}

export interface CancelRequestBody {
  requestId: string;
}

export interface ProcessRequestBody {
  requestId: string;
  walletId?: string;
  transactionHash?: string;
}

// API response types
export interface AuthorizationResult {
  success: boolean;
  error?: string;
  data?: any;
  requestId?: string;
  transactionHash?: string;
}

export interface CreateAuthorizationResponse {
  requestId: string;
  authToken: string;
  userAddress: string;
  creditCost: number;
  expiresAt: string;
  authorizationUrl: string;
}

export interface AuthorizeRequestResponse {
  success: true;
  message: string;
  requestId: string;
  userAddress: string;
  status: 'authorized';
  authorizedAt: string;
  // TODO: Add when blockchain integration complete
  emailWalletId?: string | null;
  transactionHash?: string | null;
}

export interface PendingRequestsResponse {
  userAddress: string;
  pendingRequests: AuthorizationRequestAPI[];
  totalCount: number;
}

export interface AuthorizationRequestAPI {
  requestId: string;
  userAddress: string;
  emailSubject: string;
  emailSender: string;
  attachmentCount: number;
  creditCost: number;
  authToken: string;
  status: AuthorizationStatus;
  createdAt: string;
  expiresAt: string;
  metadata?: AuthorizationMetadata;
}

// Service types
export interface AuthorizationServiceStats {
  total: number;
  pending: number;
  expired: number;
  processed: number;
}

export interface AuthorizationHealthStatus {
  healthy: boolean;
  service: string;
  stats: AuthorizationServiceStats;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  timestamp: string;
}

// Email processing integration types
export interface EmailToAuthorizationData {
  userAddress: string;
  fromAddress: string;
  subject: string;
  contentHash: string;
  attachmentCount?: number;
  attachmentHashes?: string[];
  ipfsHash?: string;
  rawEmailData?: any;
}

export interface EmailToAuthorizationResult {
  success: boolean;
  requestId?: string;
  authorizationUrl?: string;
  error?: string;
}

// Express request extensions
declare global {
  namespace Express {
    interface Request {
      app: {
        locals: {
          domain?: string;
          config?: any;
        };
      };
    }
  }
}

// Credit cost configuration
export interface CreditCosts {
  EMAIL_WALLET: number;
  ATTACHMENT: number;
  PROCESSING: number;
}

// Request expiration configuration
export interface AuthorizationConfig {
  REQUEST_EXPIRY_HOURS: number;
  CLEANUP_INTERVAL_HOURS: number;
  MAX_REQUESTS_PER_USER: number;
  MAX_SUBJECT_LENGTH: number;
}

export const DEFAULT_CREDIT_COSTS: CreditCosts = {
  EMAIL_WALLET: 3,
  ATTACHMENT: 2,
  PROCESSING: 1
} as const;

export const DEFAULT_AUTH_CONFIG: AuthorizationConfig = {
  REQUEST_EXPIRY_HOURS: 24,
  CLEANUP_INTERVAL_HOURS: 1,
  MAX_REQUESTS_PER_USER: 100,
  MAX_SUBJECT_LENGTH: 200
} as const;