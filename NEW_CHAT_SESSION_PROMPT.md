# SKS Rootz Platform - New Chat Session Prompt

## Use This Prompt for Any New Claude Chat Session

```
I'm working on the SKS Rootz Platform - a production email-to-blockchain system currently deployed on Ubuntu server at rootz.global. This is an active system with working smart contracts and services.

CRITICAL CONTEXT - READ FIRST:

## Current System Status
- **Platform**: SKS Rootz Platform (EPISTERY-based architecture)
- **Server**: Ubuntu at rootz.global, ports 3000 (main), 5000 (legacy API)
- **Services**: Email Processing + Local IPFS + Blockchain Authorization
- **Blockchain**: Polygon Amoy testnet with deployed smart contracts
- **Storage**: Local IPFS node + Pinata for distributed storage
- **Email Integration**: Microsoft Graph API (process@rivetz.com)

## Recently Completed (September 12, 2025)
✅ **Complete Email Processing System** - Transform emails to blockchain wallets
- EmailParser: Raw email → structured data with SPF/DKIM/DMARC validation
- LocalIPFSService: Email packages → decentralized storage with content addressing
- AuthorizationService: Blockchain authorization requests via MetaMask
- EmailProcessingController: End-to-end workflow orchestration
- 5 API endpoints: process, test-parse, health, authorize, complete

✅ **TypeScript Compilation Issues Fixed** - All 57 errors resolved
- Added missing @core/configuration module (EPISTERY Config class)
- Fixed ethers.js v5 syntax (providers.JsonRpcProvider, utils.keccak256)
- Fixed mailparser imports (simpleParser vs parseString)
- Added proper error type handling and type safety

## Active Smart Contracts (Polygon Amoy)
- **AuthorizationManagerFixed**: 0xcC2a65A8870289B1d33bA741069cC2CEEA219573 ✅
- **EmailDataWallet**: 0x52eBB3761D36496c29FB6A3D5354C449928A4048 ✅
- **EmailWalletRegistration**: 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F ✅
- **Platform Service Wallet**: 0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a (89+ POL)

## Current Architecture
```
Raw Email → EmailParser → LocalIPFS → Authorization → User MetaMask → Blockchain Wallet
```

**Workflow:**
1. Email processing extracts structured data + authentication (SPF/DKIM/DMARC)
2. Complete email package uploaded to local IPFS with content addressing
3. Blockchain authorization request created (service wallet pays gas)
4. User receives notification → signs MetaMask approval → wallet created

## API Endpoints Working
- `POST /.rootz/email-processing/process` - Complete email → blockchain workflow
- `POST /.rootz/email-processing/test-parse` - Test email parsing only
- `GET /.rootz/email-processing/health` - Health check all services
- `POST /.rootz/email-processing/authorize/:id` - Handle user authorization
- `POST /.rootz/email-processing/complete/:id` - Complete wallet creation

## Configuration (EPISTERY Pattern)
- **Location**: ~/.data-wallet/rootz.global/config.ini
- **Format**: Domain-aware INI files with sections [blockchain], [ipfs], [platform]
- **Security**: Private keys stored in INI files, NOT in git repository
- **Environment**: Supports environment variable overrides

## Current Technical Stack
- **Backend**: TypeScript/Node.js with Express (EPISTERY patterns)
- **Email**: Microsoft Graph API OAuth2 (process@rivetz.com)
- **Storage**: Local IPFS node (port 5001) + content addressing
- **Blockchain**: ethers.js v5 with Polygon Amoy testnet
- **Dependencies**: mailparser, ipfs-http-client, ethers@5.8.0

## Recent Git Status
- **Repository**: https://github.com/rootz-global/sks-rootz-platform
- **Latest**: TypeScript fixes applied and pushed
- **Files**: 20+ new files including complete email processing system
- **Status**: All compilation errors resolved, ready for deployment

## Prerequisites Working
✅ Email monitoring via Microsoft Graph API
✅ Local IPFS node running on port 5001
✅ Service wallet with POL balance for blockchain operations
✅ Smart contracts deployed and functional
✅ User registration system with credit allocation

## Common Issues & Solutions
- **TypeScript errors**: All resolved with proper imports and types
- **IPFS connectivity**: Local node at http://localhost:5001
- **Configuration**: Use EPISTERY INI pattern, not hardcoded secrets
- **Blockchain**: Use ethers v5 syntax (providers.JsonRpcProvider)
- **Git workflow**: Never overwrite working configuration files

## Current Goal/Issue
[UPDATE THIS SECTION FOR EACH NEW CHAT]
- Current task: [Describe what you're working on]
- Specific issue: [Any errors or problems you're facing]
- Context: [What you were trying to accomplish]

## What I Need Help With Today
[Be specific about your current question or task]

The system is production-ready with working email-to-blockchain transformation. All major components are implemented and TypeScript compilation issues resolved.
```

## How to Customize This Prompt

1. **Update "Current Goal/Issue" section** with your specific problem
2. **Add any new error messages** you're encountering
3. **Include recent changes** if you've made modifications
4. **Specify the exact help needed** - deployment, testing, new features, etc.

## Example Customizations

### For Deployment Issues:
```
Current Goal: Deploy the email processing system to Ubuntu server
Specific issue: [Copy exact error messages from server]
What I need help with: Getting the services running and testing the complete workflow
```

### For New Feature Development:
```
Current Goal: Add email notification system for user authorization requests
Current task: Implement SMTP email sending service
What I need help with: Integrating with existing EmailProcessingController workflow
```

### For Testing/Debugging:
```
Current Goal: Test the complete email-to-blockchain workflow
Specific issue: [Copy test results or error messages]
What I need help with: Verifying all services work together correctly
```

This prompt gives any AI assistant complete context about your SKS Rootz Platform without losing critical information between chat sessions.
