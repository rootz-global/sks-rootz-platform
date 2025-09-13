# SKS Rootz Platform - Smart Contracts

This directory contains the active smart contracts, ABIs, and deployment documentation for the SKS Rootz Platform Email Wallet System.

## Directory Structure

```
contracts/
├── active/                     # Active contract source code
│   ├── AuthorizationManagerFixed.sol    # Authorization workflow contract
│   ├── EmailDataWallet.sol              # Email wallet creation contract
│   └── interfaces/                      # Contract interfaces
├── abis/                       # Contract ABIs for integration
│   ├── AuthorizationManagerFixed.json
│   ├── EmailDataWallet.json
│   └── EmailWalletRegistration.json
├── deployment/                 # Deployment documentation
│   ├── ACTIVE_CONTRACTS.md             # Current deployments
│   └── deployment-history.md           # Historical deployments
└── README.md                   # This file
```

## Quick Reference

### Active Contract Addresses (Polygon Amoy)
- **AuthorizationManagerFixed:** `0xcC2a65A8870289B1d33bA741069cC2CEEA219573`
- **EmailDataWallet:** `0x52eBB3761D36496c29FB6A3D5354C449928A4048`  
- **EmailWalletRegistration:** `0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F`
- **AttachmentWallet:** `0x5e0e2d3FE611e4FA319ceD3f2CF1fe7EdBb5Dbb7`

### Platform Service Wallet
- **Address:** `0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a`
- **Role:** Contract owner, handles service operations
- **Balance:** 89+ POL (sufficient for operations)

## Contract Architecture

### Authorization Flow
1. **Service** creates authorization request via AuthorizationManagerFixed
2. **User** signs authorization via MetaMask (requestId signature)  
3. **Service** processes authorization and creates wallets
   - Calls EmailDataWallet.createEmailWallet()
   - Calls AttachmentWallet.createAttachmentWallet() for each attachment

### Contract Relationships
```
AuthorizationManagerFixed
├─→ Calls EmailDataWallet (for wallet creation)
├─→ Calls AttachmentWallet (for attachment wallets)
└─→ Calls EmailWalletRegistration (for credit management)
```

## Integration with SKS Rootz Platform

### Configuration
```typescript
// src/core/configuration/blockchain.ini
[contracts]
authorization=0xcC2a65A8870289B1d33bA741069cC2CEEA219573
emailData=0x52eBB3761D36496c29FB6A3D5354C449928A4048
registration=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
attachment=0x5e0e2d3FE611e4FA319ceD3f2CF1fe7EdBb5Dbb7
```

### Service Implementation
```typescript
import { AuthorizationManagerFixed__factory } from '../contracts/types';

const authContract = AuthorizationManagerFixed__factory.connect(
    CONTRACT_ADDRESS,
    serviceWallet
);
```

## Credit Costs
- **Email Wallet:** 3 credits
- **Attachment Wallet:** 2 credits each  
- **Processing:** 1 credit
- **Example:** Email + 2 attachments = 8 credits total

## Development

### Adding New Contracts
1. Add source code to `active/`
2. Generate ABI and add to `abis/`
3. Update `deployment/ACTIVE_CONTRACTS.md`
4. Update platform configuration

### Verification
Always verify deployments against PolyScan:
- [Platform Service Wallet Transactions](https://amoy.polygonscan.com/address/0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a)

## Security Notes

### ✅ AuthorizationManagerFixed Security Features  
- Simple signature validation (fixed timestamp dependency issue)
- Reentrancy protection
- Request ownership validation
- Credit cost verification before processing

### ⚠️ Important Security Practices
- Never hardcode private keys in source code
- Use EPISTERY INI pattern for configuration
- Verify all contract addresses before deployment
- Always test on testnet before mainnet

## Testing

The contracts have been tested on Polygon Amoy testnet with:
- ✅ Service wallet operations
- ✅ User registration system  
- ✅ Authorization request creation
- ✅ Basic blockchain connectivity
- 🔄 Full email processing pipeline (in development)

## Next Steps

1. **Email Parsing Module** - Extract structured data from emails
2. **Local IPFS Integration** - Store email content on local IPFS node
3. **Authorization Flow** - Complete MetaMask signature workflow  
4. **End-to-End Testing** - Email → IPFS → Authorization → Blockchain

---

**Last Updated:** September 12, 2025  
**Network:** Polygon Amoy Testnet (Chain ID: 80002)  
**Documentation:** See `deployment/ACTIVE_CONTRACTS.md` for complete details
