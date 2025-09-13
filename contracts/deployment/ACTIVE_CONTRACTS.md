# Active Contract Deployments

**Network:** Polygon Amoy Testnet (Chain ID: 80002)  
**Last Updated:** September 12, 2025  
**Platform Service Wallet:** `0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a`  

## Currently Active Contracts

### ✅ AuthorizationManagerFixed
- **Address:** `0xcC2a65A8870289B1d33bA741069cC2CEEA219573`
- **Deployed:** September 8, 2025
- **Status:** ✅ ACTIVE - Latest version with signature validation fix
- **Purpose:** Manages email wallet authorization workflow
- **Contract Size:** 10.832 KiB
- **Source:** `contracts/active/AuthorizationManagerFixed.sol`
- **Key Features:**
  - Fixed signature validation (removed block.timestamp dependency)
  - User authorization via MetaMask signatures
  - Credit cost calculation and deduction
  - Request lifecycle management (pending → authorized → processed)

### ✅ EmailDataWallet  
- **Address:** `0x52eBB3761D36496c29FB6A3D5354C449928A4048`
- **Deployed:** Earlier deployment (still current)
- **Status:** ✅ ACTIVE - Production ready
- **Purpose:** Creates and manages actual email data wallets
- **Source:** `contracts/active/EmailDataWallet.sol` 
- **Key Features:**
  - Email content storage with IPFS integration
  - SPF/DKIM/DMARC authentication tracking
  - Wallet lifecycle management
  - Owner verification and access control

### ✅ EmailWalletRegistration
- **Address:** `0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F`
- **Status:** ✅ ACTIVE
- **Purpose:** User registration and credit management
- **Key Features:**
  - User wallet registration
  - Credit allocation and tracking
  - Balance inquiries

### ✅ AttachmentWallet  
- **Address:** `0x5e0e2d3FE611e4FA319ceD3f2CF1fe7EdBb5Dbb7`
- **Status:** ✅ ACTIVE
- **Purpose:** Manages email attachment wallets
- **Key Features:**
  - Individual wallet per attachment
  - File metadata and content hash tracking
  - IPFS hash storage

## Deprecated Contracts (DO NOT USE)

### ❌ AuthorizationManager (Original)
- **Address:** `0x3D00d01d779f7f11E89897320A2CcA47FFC14887`
- **Status:** ❌ DEPRECATED - Has signature verification bug
- **Issue:** Complex signature validation with block.timestamp dependency
- **Replaced By:** AuthorizationManagerFixed

### ❌ AuthorizationManager (Legacy)
- **Address:** `0x555ba5C1ff253c1D91483b52F1906670608fE9bC`
- **Status:** ❌ DEPRECATED - Earliest version
- **Issue:** Multiple authorization flow issues
- **Replaced By:** AuthorizationManagerFixed

## Contract Architecture

### Authorization Flow
```
1. Service → AuthorizationManagerFixed.createAuthorizationRequest()
2. User → AuthorizationManagerFixed.authorizeEmailWalletCreation() [MetaMask signature]
3. Service → AuthorizationManagerFixed.processAuthorizedRequest()
   └─→ Calls EmailDataWallet.createEmailWallet() 
   └─→ Calls AttachmentWallet.createAttachmentWallet() (for each attachment)
```

### Credit Costs
- **Email Wallet Creation:** 3 credits
- **Attachment Wallet:** 2 credits each
- **Authorization Processing:** 1 credit
- **Total Example:** Email with 2 attachments = 3 + (2×2) + 1 = 8 credits

### Signature Validation (FIXED)
The AuthorizationManagerFixed contract uses simple signature validation:
```solidity
// FIXED: Simple signature validation using only requestId
bytes32 ethSignedMessageHash = requestId.toEthSignedMessageHash();
address signer = ethSignedMessageHash.recover(signature);
require(signer == msg.sender, "Invalid signature");
```

This allows predictable client-side signing using just the `requestId`.

## Configuration for SKS Rootz Platform

```typescript
// config/localhost/platform.ini
[blockchain]
authorizationContract=0xcC2a65A8870289B1d33bA741069cC2CEEA219573
emailDataContract=0x52eBB3761D36496c29FB6A3D5354C449928A4048
registrationContract=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
attachmentContract=0x5e0e2d3FE611e4FA319ceD3f2CF1fe7EdBb5Dbb7
serviceWalletPrivateKey=YOUR_SERVICE_WALLET_PRIVATE_KEY
rpcUrl=https://rpc-amoy.polygon.technology/
```

## Verification Links

**PolyScan URLs:**
- [AuthorizationManagerFixed](https://amoy.polygonscan.com/address/0xcC2a65A8870289B1d33bA741069cC2CEEA219573)
- [EmailDataWallet](https://amoy.polygonscan.com/address/0x52eBB3761D36496c29FB6A3D5354C449928A4048)
- [EmailWalletRegistration](https://amoy.polygonscan.com/address/0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F)
- [Platform Service Wallet](https://amoy.polygonscan.com/address/0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a)

## Testing Status

### ✅ Confirmed Working
- Contract deployments verified on-chain
- Platform service wallet has 89+ POL balance
- User registration system operational
- Authorization request creation functional
- Basic blockchain connectivity confirmed

### 🔄 Next Steps
- Email parsing implementation
- Local IPFS integration  
- Authorization flow with MetaMask signatures
- End-to-end email → IPFS → authorization → blockchain testing

---

**Important:** Always verify contract addresses against PolyScan before deployment. The blockchain is the definitive source of truth.
