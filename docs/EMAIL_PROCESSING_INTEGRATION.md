# Email Processing + IPFS + Authorization Integration

This document describes the new **Email Processing, IPFS Storage, and Blockchain Authorization** components built for the SKS Rootz Platform.

## Architecture Overview

```
Raw Email → Email Parser → IPFS Upload → Authorization Request → User Approval → Blockchain Wallet
```

### Component Flow
1. **Email Parser** extracts structured data from raw email content
2. **Local IPFS Service** uploads email package to decentralized storage  
3. **Authorization Service** creates blockchain authorization request
4. **User** receives notification and signs MetaMask approval
5. **Blockchain** creates immutable EMAIL_WALLET with IPFS reference

## Services Created

### 📧 EmailParser
**Location:** `src/services/email-processing/EmailParser.ts`

**Purpose:** Parse raw email content into structured, blockchain-ready data

**Key Features:**
- Full email parsing with headers, body, attachments
- SPF/DKIM/DMARC authentication extraction
- Content hash generation (SHA-256)
- Attachment processing with individual content hashes
- Email validation and error checking

**Usage:**
```typescript
const parser = new EmailParser();
const emailData = await parser.parseEmail(rawEmailString);
const validation = parser.validateEmailData(emailData);
```

### 💾 LocalIPFSService  
**Location:** `src/services/ipfs/LocalIPFSService.ts`

**Purpose:** Upload email packages to local IPFS node for decentralized storage

**Key Features:**
- Connection to local IPFS node (http://localhost:5001)
- Complete email package creation with metadata
- Individual attachment upload to IPFS
- Content pinning to prevent garbage collection
- Health monitoring and node statistics

**Usage:**
```typescript
const ipfs = new LocalIPFSService(config);
await ipfs.initialize();
const result = await ipfs.uploadEmailPackage(emailData, attachments);
```

### 🔐 AuthorizationService
**Location:** `src/services/authorization/AuthorizationService.ts` 

**Purpose:** Create blockchain authorization requests and process user approvals

**Key Features:**
- Integration with AuthorizationManagerFixed contract
- Service wallet management for gas payments
- Authorization request lifecycle management
- Wallet creation processing after user approval
- Real-time blockchain status monitoring

**Usage:**
```typescript
const auth = new AuthorizationService(config);
const result = await auth.createAuthorizationRequest(userAddress, emailData, ipfsHash);
```

### 🎮 EmailProcessingController
**Location:** `src/controllers/EmailProcessingController.ts`

**Purpose:** Orchestrate the complete email-to-blockchain workflow

**Key Features:**
- End-to-end workflow coordination
- User notification management
- Authorization status tracking  
- Error handling and recovery
- Health monitoring across all services

## API Endpoints

### Process Email
```
POST /.rootz/email-processing/process
Content-Type: application/json

{
  "userAddress": "0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b",
  "rawEmail": "From: sender@domain.com\nTo: user@rootz.global\n...",
  "notifyUser": true
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "0xa02a5d844029f5e4f7617daf29012019ab7e9b78",
  "authToken": "0x1234567890abcdef",
  "ipfsHash": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "emailSummary": "Email from demo@techcorp.com with subject...",
  "authorizationUrl": "http://rootz.global/.email-admin/authorization.html?token=..."
}
```

### Test Email Parsing
```
POST /.rootz/email-processing/test-parse
Content-Type: application/json

{
  "rawEmail": "From: test@example.com\n..."
}
```

### Health Check
```
GET /.rootz/email-processing/health
```

**Response:**
```json
{
  "healthy": true,
  "services": {
    "ipfs": {
      "healthy": true,
      "details": {
        "nodeId": "12D3KooWXXXXXXXXXXXXXXXXXX",
        "version": "kubo/0.22.0"
      }
    },
    "authorization": {
      "healthy": true,
      "details": {
        "serviceWallet": "0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a",
        "balance": "89.79 POL",
        "blockNumber": 26155432
      }
    }
  }
}
```

## Configuration

### Required Configuration (config/localhost/config.ini)
```ini
[blockchain]
serviceWalletPrivateKey=YOUR_PRIVATE_KEY_HERE
contractAuthorization=0xcC2a65A8870289B1d33bA741069cC2CEEA219573
rpcUrl=https://rpc-amoy.polygon.technology/

[ipfs]
localUrl=http://localhost:5001
gatewayUrl=http://localhost:8080

[platform]
baseUrl=http://rootz.global
```

## Dependencies Added

### Production Dependencies
```json
{
  "mailparser": "^3.6.5",        // Email parsing library
  "ipfs-http-client": "^60.0.1", // IPFS node communication
  "ethers": "5.8.0"              // Blockchain integration (existing)
}
```

### Development Dependencies  
```json
{
  "@types/mailparser": "^3.4.0"  // TypeScript definitions
}
```

## Testing

### Run Complete Test Suite
```bash
npm run test:email-processing
```

### Test Individual Components
```bash
# Test email parsing only
npm run test:email-parser

# Test IPFS connectivity
npm run test:ipfs

# Test blockchain authorization
npm run test:authorization
```

### Manual API Testing
```bash
# Test email processing workflow
curl -X POST http://localhost:3000/.rootz/email-processing/process \
  -H "Content-Type: application/json" \
  -d @test/sample-email-request.json

# Check service health  
curl http://localhost:3000/.rootz/email-processing/health
```

## Prerequisites

### 1. Local IPFS Node
```bash
# Install IPFS
curl -sSL https://dist.ipfs.io/go-ipfs/v0.22.0/go-ipfs_v0.22.0_linux-amd64.tar.gz | tar -xzv
sudo mv go-ipfs/ipfs /usr/local/bin/

# Initialize and start
ipfs init
ipfs daemon
```

**Verify IPFS:** http://localhost:5001/webui

### 2. Blockchain Configuration
- Service wallet with POL balance on Polygon Amoy
- AuthorizationManagerFixed contract deployed
- User wallet registered with credits

### 3. Required Services
- ✅ Email parsing (mailparser)
- ✅ Local IPFS node running
- ✅ Polygon Amoy RPC connectivity
- ✅ Service wallet with gas funds

## Workflow Example

### 1. Raw Email Processing
```
From: demo@techcorp.com
Subject: Important Contract Document
Date: Thu, 12 Sep 2025 10:30:00 -0400
Attachments: contract.pdf (245KB)

Email content with authentication headers...
```

### 2. Parsed Email Data
```json
{
  "messageId": "<test.12345@techcorp.com>",
  "subject": "Important Contract Document", 
  "from": "demo@techcorp.com",
  "bodyHash": "sha256:a1b2c3d4...",
  "emailHash": "sha256:e5f6g7h8...",
  "attachments": [{
    "filename": "contract.pdf",
    "contentHash": "sha256:i9j0k1l2...",
    "size": 245760
  }],
  "authentication": {
    "spfPass": true,
    "dkimValid": true,
    "dmarcPass": true
  }
}
```

### 3. IPFS Package
```json
{
  "emailData": { /* full email data */ },
  "attachments": [{
    "filename": "contract.pdf",
    "ipfsHash": "QmYYYYYYYYYYYYYYYYYYYYYYYYYYY"
  }],
  "metadata": {
    "createdAt": "2025-09-12T14:30:00Z",
    "platform": "SKS Rootz Platform",
    "totalSize": 246890
  }
}
```

**IPFS Hash:** `QmXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### 4. Authorization Request
```solidity
// Blockchain call
createAuthorizationRequest(
  userAddress: "0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b",
  authToken: "auth-12345",
  emailHash: "0xa1b2c3d4...",
  attachmentHashes: ["0xi9j0k1l2..."]
)
```

### 5. User Authorization
User receives notification → Opens MetaMask → Signs transaction → Blockchain creates EMAIL_WALLET

**Result:** Immutable, verifiable email record with IPFS storage reference

## Security Features

### ✅ Authentication Verification
- SPF/DKIM/DMARC validation from email headers
- Content integrity via SHA-256 hashing
- Blockchain signature verification

### ✅ Decentralized Storage
- IPFS ensures content availability without central server
- Content addressing prevents tampering
- Pinning prevents garbage collection

### ✅ User Consent
- MetaMask signature required for wallet creation
- Credit cost disclosed before approval
- 24-hour authorization window

### ✅ Audit Trail
- Complete blockchain transaction history
- IPFS content verification
- Email authentication results stored

## Next Steps

1. **✅ Core Implementation** - Email parsing, IPFS, authorization complete
2. **🔄 Email Monitoring** - Integration with Microsoft Graph API
3. **🔄 User Interface** - Frontend for email wallet management
4. **🔄 Notification System** - Email/SMS alerts for authorization requests
5. **🔄 Mobile App** - MetaMask integration for mobile users

## Troubleshooting

### IPFS Connection Issues
```bash
# Check IPFS daemon status
ipfs id

# Restart IPFS daemon  
pkill ipfs
ipfs daemon

# Check port availability
curl http://localhost:5001/api/v0/id
```

### Blockchain Connection Issues
```bash
# Test RPC connectivity
curl -X POST https://rpc-amoy.polygon.technology/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check service wallet balance
curl http://localhost:3000/.rootz/authorization/wallet/balance
```

### Email Parsing Issues
- Verify raw email format includes headers
- Check for non-UTF8 characters in content
- Ensure attachment encoding is supported

---

**Status:** ✅ Implementation Complete - Ready for Integration Testing  
**Next Milestone:** End-to-end testing with real email data
