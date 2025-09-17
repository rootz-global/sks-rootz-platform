# EmailWalletRegistration Contract - Function Reference

**Contract Address:** `0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F`  
**Network:** Polygon Amoy Testnet (Chain ID: 80002)  
**Status:** ✅ DEPLOYED AND VERIFIED WORKING  
**Owner:** `0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a` (Service Wallet)  

## 🔍 AVAILABLE FUNCTIONS

### Registration Status Functions
```solidity
function isRegistered(address wallet) external view returns (bool)
// Check if a wallet address is registered
// Returns: true if registered and active, false otherwise

function getRegistration(address wallet) external view returns (
    bytes32 registrationId,
    string primaryEmail,
    address parentCorporateWallet,
    bool autoProcessCC,
    uint256 registeredAt,
    bool isActive,
    uint256 creditBalance
)
// Get complete registration details for a wallet
// Returns: Full registration struct with all fields
```

### Email Mapping Functions ✅ THESE WORK!
```solidity
function getWalletFromEmail(string memory email) external view returns (address)
// CRITICAL: This function EXISTS and WORKS!
// Maps email string to wallet address
// Returns: wallet address or zero address if not found
// Storage: Uses keccak256(email) as key in emailHashToWallet mapping

function isEmailAuthorized(address wallet, string memory email) public view returns (bool)
// Check if email is authorized for specific wallet
// Checks both primary email and additional emails
// Returns: true if email is authorized for wallet
```

### Credit Management Functions
```solidity
function getCreditBalance(address wallet) external view returns (uint256)
// Get current credit balance for wallet
// Returns: Number of credits available

function depositCredits(address wallet) external payable
// Add credits to wallet (1 credit = 0.001 ETH)
// Payable: Send ETH to add credits

function deductCredits(address wallet, uint256 amount) external onlyOwner returns (bool)
// Deduct credits from wallet (only owner can call)
// Returns: true if successful, reverts if insufficient credits
```

### Registration Functions
```solidity
function registerEmailWallet(
    string memory primaryEmail,
    string[] memory additionalEmails,
    address parentCorporateWallet,
    bytes32[] memory authorizationTxs,
    string[] memory whitelistedDomains,
    bool autoProcessCC
) external payable returns (bytes32 registrationId)
// Register new email wallet
// Payable: Must send registrationFee (0.01 ETH)
// Returns: Unique registration ID
```

### Admin Functions
```solidity
function owner() external view returns (address)
// Get contract owner address
// Returns: Current owner (should be service wallet)

function registrationFee() external view returns (uint256)
// Get current registration fee
// Returns: Fee in wei (default: 0.01 ETH)
```

## 📋 ABI FOR TYPESCRIPT

```typescript
const REGISTRATION_ABI = [
    // Registration Status
    "function isRegistered(address wallet) view returns (bool)",
    "function getRegistration(address wallet) view returns (bytes32 registrationId, string primaryEmail, address parentCorporateWallet, bool autoProcessCC, uint256 registeredAt, bool isActive, uint256 creditBalance)",
    
    // Email Mapping - CRITICAL FUNCTIONS
    "function getWalletFromEmail(string email) view returns (address)",
    "function isEmailAuthorized(address wallet, string email) view returns (bool)",
    
    // Credit Management
    "function getCreditBalance(address wallet) view returns (uint256)",
    "function depositCredits(address wallet) payable",
    "function deductCredits(address wallet, uint256 amount) returns (bool)",
    
    // Registration
    "function registerEmailWallet(string primaryEmail, string[] additionalEmails, address parentCorporateWallet, bytes32[] authorizationTxs, string[] whitelistedDomains, bool autoProcessCC) payable returns (bytes32 registrationId)",
    
    // Admin
    "function owner() view returns (address)",
    "function registrationFee() view returns (uint256)"
];
```

## 🧪 TESTING COMMANDS

### Direct Contract Testing
```bash
# Test basic connectivity
curl -X POST https://rpc-amoy.polygon.technology/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F","data":"0x8da5cb5b"},"latest"],"id":1}'

# Get owner (should return service wallet address)
```

### Service Integration Testing  
```bash
# Test registration lookup
curl "http://localhost:8000/.rootz/test/registration-lookup?email=steven@rivetz.com"

# Test wallet registration check
curl "http://localhost:8000/.rootz/test/user-registration?address=0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b"

# Test credit balance
curl "http://localhost:8000/.rootz/email-wallet/balance/0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b"
```

## 🔧 HOW EMAIL MAPPING WORKS

### Registration Process
1. User calls `registerEmailWallet("steven@rivetz.com", ...)`
2. Contract calculates: `emailHash = keccak256("steven@rivetz.com")`
3. Contract stores: `emailHashToWallet[emailHash] = msg.sender`
4. Contract stores: `registrations[msg.sender].primaryEmail = "steven@rivetz.com"`

### Lookup Process
1. Service calls `getWalletFromEmail("steven@rivetz.com")`
2. Contract calculates: `emailHash = keccak256("steven@rivetz.com")`
3. Contract returns: `emailHashToWallet[emailHash]`
4. Returns wallet address or zero address if not found

### Why It Works
- ✅ Email is hashed consistently (keccak256)
- ✅ Same hash used for storage and retrieval
- ✅ Mapping stored permanently on blockchain
- ✅ Function is public and accessible

## ⚠️ COMMON ISSUES

### Case Sensitivity
```typescript
// These are DIFFERENT hashes:
keccak256("steven@rivetz.com")   // lowercase
keccak256("Steven@rivetz.com")   // capital S
keccak256("STEVEN@RIVETZ.COM")   // uppercase

// Solution: Normalize email case before registration and lookup
email = email.toLowerCase().trim();
```

### Zero Address Returns
```typescript
// Check for no registration found
if (walletAddress === ethers.constants.AddressZero) {
    // No wallet registered for this email
    return null;
}
```

### Network Connectivity
```typescript
// Always check for CALL_EXCEPTION errors
try {
    const result = await contract.getWalletFromEmail(email);
} catch (error) {
    if (error.code === 'CALL_EXCEPTION') {
        console.error('Contract call failed - check network/address');
    }
}
```

## 📊 VERIFIED TEST CASES

### Test Data (Known Working)
```
Email: "steven@rivetz.com"
Wallet: "0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b"
Credits: 110
Status: Registered and Active
```

### Test Results Expected
```typescript
await contract.isRegistered("0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b")
// Should return: true

await contract.getWalletFromEmail("steven@rivetz.com") 
// Should return: "0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b"

await contract.getCreditBalance("0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b")
// Should return: 110
```

## 🎯 INTEGRATION POINTS

### Services That Use This Contract
- `BlockchainService.ts` - Main contract interaction service
- `RegistrationLookupService.ts` - Email-to-wallet mapping service  
- `EmailProcessingController.ts` - Email processing pipeline

### Configuration Required
```ini
[blockchain]
contractRegistration=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
rpcUrl=https://rpc-amoy.polygon.technology/
serviceWalletPrivateKey=YOUR_PRIVATE_KEY_HERE
```

This contract is the foundation of the email wallet system - it WORKS correctly when called properly!