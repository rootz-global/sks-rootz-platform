# SKS Rootz Platform - Smart Contract Command Reference

**Last Updated:** September 15, 2025  
**Network:** Polygon Amoy Testnet (Chain ID: 80002)  
**Service Wallet:** 0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a  

---

## EmailWalletRegistration Contract
**Address:** `0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F`  
**Purpose:** User registration and credit management

### Read Functions (View)
```typescript
// Check if user is registered
isRegistered(address wallet) → bool

// Get user's credit balance
getCreditBalance(address wallet) → uint256

// Get complete registration details
getRegistration(address wallet) → (
  bytes32 registrationId,
  string primaryEmail, 
  address parentCorporateWallet,
  bool autoProcessCC,
  uint256 registeredAt,
  bool isActive,
  uint256 creditBalance
)

// Get contract owner
owner() → address
```

### Write Functions (Transaction)
```typescript
// Register new user with email
registerEmailWallet(
  string primaryEmail,
  string[] additionalEmails,
  address parentCorporateWallet,
  bytes32[] authorizationTxs,
  string[] whitelistedDomains,
  bool autoProcessCC
) payable → bytes32 registrationId

// Deposit credits for user
depositCredits(address wallet) payable

// Deduct credits from user (service only)
deductCredits(address wallet, uint256 amount) → bool
```

### BlockchainService Implementation
```typescript
// Usage examples from BlockchainService.ts
await blockchainService.isUserRegistered(userAddress);
await blockchainService.getUserCredits(userAddress);
await blockchainService.getUserRegistration(userAddress);
await blockchainService.depositCredits(userAddress, "0.006");
await blockchainService.registerEmailWallet(userAddress, primaryEmail);
```

---

## EmailDataWallet Contract (Enhanced)
**Address:** `0x0eb8830FaC353A63E912861137b246CAC7FC5977`  
**Purpose:** Email data wallet creation and management

### Read Functions (View)
```typescript
// Get all email wallets for a user
getUserEmailWallets(address user) → bytes32[] memory

// Get count of active wallets for user
getActiveWalletCount(address user) → uint256

// Get email wallet details
getEmailWallet(bytes32 walletId) → (
  address owner,
  string subject,
  string sender, 
  uint256 timestamp,
  bool isActive,
  bytes32 contentHash,
  string ipfsHash
)
```

### Write Functions (Transaction)
```typescript
// Create new email wallet
createEmailWallet(
  address owner,
  string subject,
  string sender,
  bytes32 contentHash,
  string ipfsHash
) → bytes32 walletId
```

### BlockchainService Implementation
```typescript
// Enhanced contract functions
await blockchainService.getUserEmailWallets(userAddress);
await blockchainService.getActiveWalletCount(userAddress);
await blockchainService.createEmailWallet(
  ownerAddress, subject, sender, contentHash, ipfsHash
);
await blockchainService.getEmailWallet(walletId);
```

---

## AuthorizationManager Contract
**Address:** `0xcC2a65A8870289B1d33bA741069cC2CEEA219573`  
**Purpose:** User authorization workflow for email wallet creation

### Read Functions (View)
```typescript
// Get authorization request details
getAuthorizationRequest(bytes32 requestId) → (
  address userWallet,
  string authToken,
  bytes32 emailHash,
  uint256 attachmentCount,
  uint256 creditCost,
  uint256 createdAt,
  uint256 expiresAt,
  uint8 status
)
```

### Write Functions (Transaction)
```typescript
// Create authorization request (service only)
createAuthorizationRequest(
  address userWallet,
  string authToken,
  bytes32 emailHash,
  bytes32[] attachmentHashes
) → bytes32 requestId

// User authorizes email wallet creation
authorizeEmailWalletCreation(
  bytes32 requestId,
  bytes signature
)

// Process authorized request (service only)
processAuthorizedRequest(
  bytes32 requestId,
  tuple(
    string forwardedBy,
    string originalSender,
    string messageId,
    string subject,
    bytes32 bodyHash,
    bytes32 emailHash,
    bytes32 emailHeadersHash,
    uint256 attachmentCount,
    string ipfsHash,
    tuple(
      bool spfPass,
      bool dkimValid,
      bool dmarcPass,
      string dkimSignature
    ) authResults
  ) emailData,
  tuple(
    string originalFilename,
    string filename,
    string mimeType,
    string fileExtension,
    uint256 fileSize,
    bytes32 contentHash,
    string fileSignature,
    string ipfsHash,
    uint256 attachmentIndex,
    string emailSender,
    string emailSubject,
    uint256 emailTimestamp
  )[] attachmentData
) → tuple(
  bool success,
  bytes32 emailWalletId,
  bytes32[] attachmentWalletIds,
  uint256 totalCreditsUsed,
  string errorMessage
)
```

### AuthorizationService Implementation
```typescript
// From AuthorizationService.ts
await authService.createAuthorizationRequest(userAddress, emailData, ipfsHash);
await authService.getAuthorizationRequest(requestId);
await authService.processAuthorizedRequest(requestId, emailData, ipfsHash);
```

---

## AttachmentWallet Contract (Legacy)
**Address:** `0x5e0e2d3FE611e4FA319ceD3f2CF1fe7EdBb5Dbb7`  
**Purpose:** Email attachment storage (currently unused)
**Status:** Available but not actively implemented

---

## Service Integration Patterns

### Configuration Access
```typescript
// Using getConfigValue() helper method
private getConfigValue(key: string): string | undefined {
  // Handles both Config instances and raw objects
  if (this.config && typeof this.config.get === 'function') {
    return this.config.get(key);
  }
  // Handle raw config object (legacy)
  // ... implementation
}

// Usage in contract initialization
const registrationAddress = this.getConfigValue('blockchain.contractRegistration');
const emailDataWalletAddress = this.getConfigValue('blockchain.contractEmailDataWallet');
```

### Gas Management
```typescript
// Dynamic gas pricing
private async getGasPricing() {
  const feeData = await this.provider.getFeeData();
  const minGasPrice = ethers.utils.parseUnits('30', 'gwei');
  const minPriorityFee = ethers.utils.parseUnits('25', 'gwei');
  
  return {
    maxFeePerGas: feeData.maxFeePerGas?.gt(minGasPrice) ? feeData.maxFeePerGas : minGasPrice,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.gt(minPriorityFee) ? feeData.maxPriorityFeePerGas : minPriorityFee
  };
}
```

### Error Handling
```typescript
// Address validation
private validateAndFormatAddress(address: string): string {
  try {
    return ethers.utils.getAddress(address.toLowerCase());
  } catch (error) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
}
```

---

## API Testing Commands

### Platform Health Check
```bash
curl http://localhost:8000/.rootz/status
```

### Blockchain Integration Test
```bash
curl http://localhost:8000/.rootz/test/blockchain-write
# Expected: { "blockchainWriteTest": true, "basicWrite": true, "enhancedContract": true }
```

### User Balance Check
```bash
curl http://localhost:8000/.rootz/email-wallet/balance/0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b
# Expected: { "address": "0x...", "credits": 110, "isRegistered": true }
```

### User Registration
```bash
curl -X POST http://localhost:8000/.rootz/email-wallet/register \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0xNewAddress","signature":"0xSignature","message":"Register"}'
```

---

## Transaction Flow Examples

### Email Wallet Creation Flow
1. **User Registration** (if not registered)
   ```typescript
   await blockchainService.registerEmailWallet(userAddress, primaryEmail);
   ```

2. **Credit Check**
   ```typescript
   const credits = await blockchainService.getUserCredits(userAddress);
   const isRegistered = await blockchainService.isUserRegistered(userAddress);
   ```

3. **Authorization Request Creation**
   ```typescript
   const result = await authService.createAuthorizationRequest(userAddress, emailData, ipfsHash);
   ```

4. **User Authorization** (MetaMask signature)
   ```typescript
   const signature = await userWallet.signMessage(requestId);
   await authContract.authorizeEmailWalletCreation(requestId, signature);
   ```

5. **Process Authorization** (Create EMAIL_WALLET)
   ```typescript
   await authService.processAuthorizedRequest(requestId, emailData, ipfsHash);
   ```

---

## Contract Deployment History

### Current Contracts (Production)
- **EmailWalletRegistration:** 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F ✅
- **EmailDataWallet:** 0x0eb8830FaC353A63E912861137b246CAC7FC5977 ✅  
- **AuthorizationManager:** 0xcC2a65A8870289B1d33bA741069cC2CEEA219573 ✅

### Legacy Contracts (Deprecated)
- **Old AuthorizationManager:** 0x3D00d01d779f7f11E89897320A2CcA47FFC14887 ❌ (Signature bug)
- **Original AuthorizationManager:** 0x555ba5C1ff253c1D91483b52F1906670608fE9bC ❌ (Deprecated)

---

## Integration Status

### ✅ Fully Implemented
- EmailWalletRegistration: Complete CRUD operations
- EmailDataWallet: Enhanced wallet management  
- Authorization workflow: Full pipeline
- Configuration management: EPISTERY pattern
- Error handling: Comprehensive logging

### 🔄 In Development
- Complete email processing pipeline
- User dashboard interface
- Advanced wallet features

### 📋 Planned
- Multi-domain configuration
- Production mainnet migration
- Enhanced security features

---

**Reference Status:** Current as of September 15, 2025  
**All functions tested and operational**  
**Ready for production email wallet creation workflow**