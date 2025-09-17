# AI DEBUGGING GUIDE - SKS Rootz Platform

**Purpose:** Master reference for AI assistants debugging this project  
**Location:** Root directory for easy discovery  
**Last Updated:** September 17, 2025  

## 🔍 FIND ISSUES FAST - QUICK REFERENCE

### Current Known Issues
- [RegistrationLookupService Fix](docs/debugging/2025-09-17-registration-lookup-hardcoded-null.md) - CRITICAL: Service hardcoded to return null

### Contract Addresses (Polygon Amoy)
- **EmailWalletRegistration:** `0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F` ✅ WORKING
- **EmailDataWallet:** `0x52eBB3761D36496c29FB6A3D5354C449928A4048` ✅ WORKING  
- **AuthorizationManager:** `0xcC2a65A8870289B1d43bA741069cC2CEEA219573` ✅ WORKING
- **Service Wallet:** `0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a` ✅ 89+ POL

### Service Status
- **SKS Platform:** Running on port 8000 ✅
- **Configuration:** EPISTERY pattern with INI files ✅
- **Email Processing:** Microsoft Graph API ✅
- **Blockchain Integration:** READ operations work, WRITE debugging in progress

## 📁 DOCUMENTATION STRUCTURE

### Core Reference Files
```
AI_DEBUGGING_GUIDE.md           <- THIS FILE - Start here
docs/
├── contracts/
│   ├── EmailWalletRegistration-ABI.md    <- Contract functions reference
│   ├── deployed-contracts.md             <- All contract addresses
│   └── contract-interactions.md          <- How services call contracts
├── debugging/
│   ├── 2025-09-17-registration-lookup-hardcoded-null.md  <- Latest issue
│   ├── common-errors.md                  <- Frequent problems
│   └── debugging-methodology.md          <- How to debug systematically
├── troubleshooting/
│   ├── service-startup-issues.md         <- Service won't start
│   ├── blockchain-connectivity.md        <- Contract connection problems
│   └── configuration-issues.md           <- Config file problems
└── architecture/
    ├── service-overview.md               <- How services connect
    ├── email-processing-flow.md          <- Email to blockchain pipeline
    └── configuration-management.md       <- EPISTERY INI pattern
```

## 🚨 CRITICAL DEBUGGING RULES

### Before Starting ANY Debugging Session:
1. **Read this file first** - Don't start from scratch
2. **Check docs/debugging/** for similar issues  
3. **Verify basic service health** with health endpoints
4. **Don't assume contract issues** - Check service code first

### Common Mistake Patterns:
- ❌ Assuming blockchain/network issues when it's service code
- ❌ Redeploying contracts when service calls them wrong  
- ❌ Complex debugging when simple code bugs exist
- ❌ Not checking if functions are actually called vs just defined

## 🔧 DEBUGGING METHODOLOGY

### Step 1: Service Health Check
```bash
curl http://localhost:8000/.rootz/status
```

### Step 2: Check Recent Issues
Look in `docs/debugging/` for similar problems

### Step 3: Verify Contract Connectivity  
```bash
curl "http://localhost:8000/.rootz/test/blockchain-write"
```

### Step 4: Check Service Logs
```bash
# On server
sudo journalctl -u email-wallet-service -f
```

### Step 5: Systematic Code Analysis
- Check if functions are called (not just defined)
- Verify configuration keys match INI files
- Look for hardcoded returns or TODOs
- Test contract functions directly

## 📋 QUICK FIXES CHECKLIST

### Service Won't Start
- [ ] Check INI file exists: `~/.data-wallet/localhost/config.ini`
- [ ] Verify private key format in config
- [ ] Check port 8000 not already in use
- [ ] Verify Node.js dependencies installed

### Blockchain Functions Fail
- [ ] Check contract addresses in INI file
- [ ] Verify service wallet has POL balance
- [ ] Test contract connectivity with curl
- [ ] Check if service actually calls contract (not hardcoded)

### Email Processing Not Working
- [ ] Verify Microsoft Graph API credentials
- [ ] Check email monitoring service enabled
- [ ] Verify user registration in contract
- [ ] Test email-to-wallet mapping

## 🎯 SUCCESS CRITERIA

### System Working Correctly:
- ✅ Service starts without errors
- ✅ Health endpoint returns status
- ✅ Contract functions return data (not errors)
- ✅ Email processing creates wallets
- ✅ User can access created wallets

### Documentation Updated:
- ✅ Issue documented in appropriate docs/ folder
- ✅ Fix recorded with before/after comparison  
- ✅ Prevention measures documented
- ✅ This guide updated with new knowledge

---

## 📞 FOR NEW AI DEBUGGING SESSIONS

**Copy this into new chat:**
```
I'm debugging the SKS Rootz Platform Email Wallet system. 

READ FIRST: AI_DEBUGGING_GUIDE.md in project root - contains critical debugging rules and known issues.

Current issue: [Describe specific problem]
Expected behavior: [What should happen]
Actual behavior: [What actually happens]
Error messages: [Exact error text]

IMPORTANT: Check docs/debugging/ for similar issues before starting from scratch. The system has known working patterns - don't reinvent solutions.
```

This approach ensures every debugging session builds on previous knowledge instead of starting over.