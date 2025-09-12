# SKS Rootz Platform API Documentation

Complete API reference for the SKS Rootz Platform services.

## Base URL and Authentication

**Base URL:** `https://rootz.global/.rootz/`  
**Authentication:** Bearer token or MetaMask signature  
**Content-Type:** `application/json`

## Platform Status Endpoints

### Get Service Status
```http
GET /.rootz/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "SKS Rootz Platform",
    "version": "1.0.0",
    "status": "healthy",
    "timestamp": "2025-01-XX:XX:XX:XXX.XXX",
    "domain": "rootz.global",
    "services": {
      "emailWallet": true,
      "secretsManagement": true,
      "aiWallet": true
    },
    "endpoints": {
      "health": "/.rootz/health",
      "status": "/.rootz/status",
      "clientLibrary": "/.rootz/lib/rootz-client.js"
    }
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Health Check
```http
GET /.rootz/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

## Email Wallet API

### Register User Wallet
```http
POST /.rootz/email-wallet/register
Content-Type: application/json

{
  "userAddress": "0x1234567890123456789012345678901234567890",
  "signature": "0x...",
  "message": "Register for Email Wallet service"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x1234567890123456789012345678901234567890",
    "credits": 60,
    "registrationDate": "2025-01-XX:XX:XX:XXX.XXX",
    "isActive": true
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Get Credit Balance
```http
GET /.rootz/email-wallet/credits/:userAddress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x1234567890123456789012345678901234567890",
    "credits": 45,
    "lastUpdated": "2025-01-XX:XX:XX:XXX.XXX"
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Get Pending Authorizations
```http
GET /.rootz/email-wallet/pending/:userAddress
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "requestId": "0xabcdef...",
      "emailSubject": "Important Document",
      "emailSender": "john@example.com",
      "attachmentCount": 2,
      "creditCost": 7,
      "createdAt": "2025-01-XX:XX:XX:XXX.XXX",
      "expiresAt": "2025-01-XX:XX:XX:XXX.XXX",
      "status": "pending"
    }
  ],
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Authorize Wallet Creation
```http
POST /.rootz/email-wallet/authorize
Content-Type: application/json

{
  "requestId": "0xabcdef1234567890...",
  "userAddress": "0x1234567890123456789012345678901234567890",
  "signature": "0x...",
  "message": "Authorize wallet creation for request 0xabcdef..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "0xabcdef1234567890...",
    "status": "authorized",
    "transactionHash": "0x...",
    "authorizedAt": "2025-01-XX:XX:XX:XXX.XXX"
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Get Created Wallets
```http
GET /.rootz/email-wallet/wallets/:userAddress
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "walletAddress": "0xwallet123...",
      "emailSubject": "Important Document",
      "emailSender": "john@example.com",
      "ipfsHash": "QmXXXXXX...",
      "createdAt": "2025-01-XX:XX:XX:XXX.XXX",
      "transactionHash": "0x...",
      "creditsCost": 7
    }
  ],
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

## Secrets Management API

### Get Configuration
```http
GET /.rootz/secrets/config/:service/:domain?
```

**Parameters:**
- `service` - Service name (email-wallet, secrets-management, ai-wallet)
- `domain` - Domain name (optional, defaults to request domain)

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "email-wallet",
    "domain": "rootz.global",
    "configuration": {
      "enabled": true,
      "credit_cost_email": 3,
      "credit_cost_attachment": 2,
      "authorization_expiry_hours": 24
    },
    "lastUpdated": "2025-01-XX:XX:XX:XXX.XXX"
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Update Configuration
```http
PUT /.rootz/secrets/config/:service/:domain
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "configuration": {
    "enabled": true,
    "credit_cost_email": 4,
    "credit_cost_attachment": 2
  },
  "signature": "0x...",
  "message": "Update configuration for email-wallet service"
}
```

## AI Wallet API

### Create AI Wallet from Email
```http
POST /.rootz/ai-wallet/create-from-email
Content-Type: application/json

{
  "emailContent": "Email content here...",
  "userAddress": "0x1234567890123456789012345678901234567890",
  "autoApprove": false,
  "confidenceThreshold": 0.8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "ai_analysis_123",
    "confidence": 0.92,
    "recommendation": "approve",
    "extractedData": {
      "sender": "john@example.com",
      "subject": "Important Document",
      "importance": "high",
      "category": "legal"
    },
    "status": "pending_approval"
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Get AI Wallet Analysis
```http
GET /.rootz/ai-wallet/analysis/:analysisId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "ai_analysis_123",
    "status": "completed",
    "confidence": 0.92,
    "recommendation": "approve",
    "reasoning": [
      "Email contains legal document",
      "Sender is verified business contact",
      "Content indicates high importance"
    ],
    "extractedMetadata": {
      "documentType": "contract",
      "parties": ["Company A", "Company B"],
      "effectiveDate": "2025-01-15",
      "expirationDate": "2026-01-15"
    }
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

## Client Library API

The browser client library provides a JavaScript interface:

```html
<script src="/.rootz/lib/rootz-client.js"></script>
```

### Initialize Client
```javascript
const rootz = await RootzPlatform.connect();
```

### Email Wallet Client Methods
```javascript
// Registration
await rootz.emailWallet.register(userAddress);

// Get data
await rootz.emailWallet.getCreditBalance(userAddress);
await rootz.emailWallet.getPendingAuthorizations(userAddress);
await rootz.emailWallet.getCreatedWallets(userAddress);

// Actions
await rootz.emailWallet.authorizeWalletCreation(requestId);
await rootz.emailWallet.rejectWalletCreation(requestId);
```

### Secrets Management Client Methods
```javascript
// Configuration management
await rootz.secrets.getConfig(service, domain);
await rootz.secrets.updateConfig(service, domain, config);
await rootz.secrets.rotateSecret(secretName);
```

### AI Wallet Client Methods
```javascript
// AI operations
await rootz.aiWallet.analyzeEmail(emailContent);
await rootz.aiWallet.getAnalysis(analysisId);
await rootz.aiWallet.approveCreation(analysisId);
```

### Platform Client Methods
```javascript
// Platform status
await rootz.getStatus();
await rootz.getHealth();
```

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Invalid or missing authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `BAD_REQUEST` (400) - Invalid request parameters
- `RATE_LIMITED` (429) - Rate limit exceeded
- `INTERNAL_ERROR` (500) - Server error

## Rate Limiting

All endpoints are rate limited:

- **Public endpoints:** 100 requests per hour per IP
- **Authenticated endpoints:** 1000 requests per hour per user
- **Admin endpoints:** 500 requests per hour per admin

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642678800
```

## Webhooks

### Email Processing Webhook
When emails are processed, the platform can send webhooks:

```http
POST /your-webhook-endpoint
Content-Type: application/json

{
  "event": "email_processed",
  "data": {
    "userAddress": "0x...",
    "emailHash": "0x...",
    "requestId": "0x...",
    "status": "authorization_required"
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

### Wallet Creation Webhook
```http
POST /your-webhook-endpoint
Content-Type: application/json

{
  "event": "wallet_created",
  "data": {
    "userAddress": "0x...",
    "walletAddress": "0x...",
    "transactionHash": "0x...",
    "ipfsHash": "QmXXX..."
  },
  "timestamp": "2025-01-XX:XX:XX:XXX.XXX"
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { RootzPlatform } from '@rootz/sks-platform-sdk';

const platform = new RootzPlatform({
  baseUrl: 'https://rootz.global/.rootz',
  apiKey: 'your-api-key'
});

// Register user
const registration = await platform.emailWallet.register({
  userAddress: '0x...',
  signature: '0x...'
});

// Get pending authorizations
const pending = await platform.emailWallet.getPending('0x...');
```

### Python
```python
from rootz_platform import RootzPlatform

platform = RootzPlatform(
    base_url='https://rootz.global/.rootz',
    api_key='your-api-key'
)

# Register user
registration = platform.email_wallet.register(
    user_address='0x...',
    signature='0x...'
)

# Get credit balance
credits = platform.email_wallet.get_credits('0x...')
```

This API documentation provides complete coverage of the SKS Rootz Platform services following EPISTERY architectural patterns.
