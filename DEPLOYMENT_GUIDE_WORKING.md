# Email Wallet System - Deployment Guide (Current Working State)

**Date:** September 17, 2025  
**Status:** Production-Ready Core System  
**Server:** Ubuntu at rootz.global  

## VERIFIED WORKING DEPLOYMENT

### System Architecture
- **Platform:** SKS Rootz Platform (TypeScript/Node.js)
- **Port:** 8000 (primary service)
- **Database:** PostgreSQL (persistent authorization storage)
- **Email:** Microsoft Graph API with OAuth2
- **Blockchain:** Polygon Amoy testnet
- **Storage:** IPFS via Pinata
- **Configuration:** EPISTERY INI pattern

### Service Management
```bash
# Navigate to deployment directory
cd /opt/sks-rootz-platform

# Standard deployment process
git pull origin main
npm run build

# Process management
ps aux | grep \"node dist/index.js\"
sudo kill [PID]  # if process running
npm start

# Health verification
curl http://localhost:8000/.rootz/status
```

### Configuration Files
**Primary Config:** ~/.data-wallet/localhost/config.ini
```ini
[blockchain]
rpcUrl=https://rpc-amoy.polygon.technology/
serviceWalletPrivateKey=36549a7f0853dee1fdad1c432076b12946646ae511a1b54a6d014c17e85d196b
contractRegistration=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
contractEmailDataWallet=0x18F3772F6f952d22D116Ce61323eC93f0E842F94

[email.microsoftGraph]
enabled=true
tenantId=9ea7bc03-5b98-4a9b-bae7-1e544994ffc7
clientId=3d8542bb-6228-4de9-a5ac-2f6b050b194f
clientSecret=vgY8Q~mURhEsSJOPhCnhwlpO21NOSLFPtZx7ScXS
userPrincipalName=process@rivetz.com
```

### Working Contract Addresses
- **EmailDataWalletOS_Secure:** 0x18F3772F6f952d22D116Ce61323eC93f0E842F94 (UNIFIED)
- **EmailWalletRegistration:** 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
- **Service Wallet:** 0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a

## OPERATIONAL PROCEDURES

### Start Email Monitoring
```bash
curl -X POST \"http://localhost:8000/.rootz/email-monitoring/start\" -H \"Content-Type: application/json\"
```

### Grant Credits to User
```bash
curl -X POST \"http://localhost:8000/.rootz/test/grant-credits\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"address\":\"0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77\",\"amount\":60}'
```

### Check System Status
```bash
curl \"http://localhost:8000/.rootz/status\"
curl \"http://localhost:8000/.rootz/email-monitoring/status\"
```

## PERFORMANCE EXPECTATIONS

### Processing Times (Verified)
- **Email Detection:** <60 seconds after receipt
- **IPFS Upload:** 2-5 seconds for typical email
- **Authorization Creation:** <5 seconds
- **Blockchain Confirmation:** 30-60 seconds
- **Total Pipeline:** 90-120 seconds end-to-end

### Resource Usage
- **Memory:** ~200MB stable
- **CPU:** <5% during normal operation
- **Disk:** Database grows ~1KB per authorization

## SUCCESS VALIDATION

### Last Verified Success (September 17, 2025)
- **Email:** \"this is atest that should work we now have credits\"
- **Sender:** steven@rivetz.com
- **Result:** EMAIL_DATA_WALLET ID #2 created
- **Transaction:** 0xf2bcfc2e7af2d8d9b803341cba9749501cff4390b57d2f14c33b9b6649f8e044
- **Gas Used:** 596,641 gas
- **Processing Time:** 30 seconds

### Validation Steps
1. Send email from steven@rivetz.com to process@rivetz.com
2. Check logs for successful processing
3. Verify IPFS upload completion
4. Confirm authorization request creation
5. Validate blockchain transaction

## TROUBLESHOOTING

### Service Won't Start
```bash
# Check for port conflicts
sudo netstat -tulpn | grep :8000

# Review error logs
cat logs/application.log
```

### Email Processing Fails
```bash
# Verify Graph API connection
curl \"http://localhost:8000/.rootz/email-monitoring/status\"

# Check user registration
curl \"http://localhost:8000/.rootz/test/registration-lookup?email=steven@rivetz.com\"
```

### Blockchain Transactions Fail
```bash
# Check service wallet balance
# Verify contract addresses in config
# Review gas pricing (30+ Gwei for Polygon Amoy)
```

## KNOWN WORKING COMPONENTS

### Email Services
- **GraphEmailMonitorService:** Fixed registration lookup
- **IntegratedEmailMonitoringService:** Fixed hardcoded mappings
- **Microsoft Graph Integration:** OAuth2 working

### Blockchain Services
- **RegistrationLookupService:** Dynamic email-to-wallet resolution
- **EnhancedAuthorizationService:** Database-persistent requests
- **EmailDataWalletOS_Secure:** Unified wallet creation

### Infrastructure
- **Credit Management:** POL-backed system operational
- **IPFS Integration:** Pinata uploads working
- **Database:** PostgreSQL with authorization persistence

## CRITICAL SUCCESS FACTORS

1. **Configuration Security:** INI files outside git repository
2. **Service Wallet:** Sufficient POL balance (89+ POL available)
3. **Graph API:** Valid OAuth credentials for process@rivetz.com
4. **Contract Addresses:** All pointing to correct deployed contracts
5. **Database:** PostgreSQL running and accessible

## NEXT PHASE: FRONTEND COMPLETION

The backend system is production-ready. Frontend authorization page needs API data loading fixes to complete the user experience.

**Current Priority:** Debug authorization.html JavaScript to properly display request details and enable user authorization flow.
