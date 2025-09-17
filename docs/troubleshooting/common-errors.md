# Common Errors and Solutions

**Purpose:** Quick reference for frequent debugging issues  
**Last Updated:** September 17, 2025

## 🚨 CRITICAL ERRORS

### Service Returns Null When Contract Has Data
**Error Pattern:**
```
[REGISTRATION] WARNING: Contract doesn't have getUserByEmail function
[REGISTRATION] No wallet registered for email: user@example.com - function not available
```

**Root Cause:** Service hardcoded to return null without calling contract

**Solution:** Check service code for hardcoded returns
```typescript
// Bad
return null; // Never calls contract

// Good  
const result = await contract.getWalletFromEmail(email);
return result === ethers.constants.AddressZero ? null : result;
```

**Files to Check:** RegistrationLookupService.ts, BlockchainService.ts

---

### CALL_EXCEPTION Errors
**Error Pattern:**
```
Error: call revert exception (method="getWalletFromEmail(string)", errorArgs=null, errorName=null, errorSignature=null, reason=null, code=CALL_EXCEPTION, version=abi/5.7.2)
```

**Common Causes:**
1. Wrong contract address in configuration
2. Network connectivity issues  
3. Function doesn't exist on deployed contract
4. ABI mismatch with deployed contract

**Solution Steps:**
1. Verify contract address: `curl https://amoy.polygonscan.com/address/0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F`
2. Test network: `curl https://rpc-amoy.polygon.technology/`  
3. Check ABI matches deployed contract source code
4. Verify function exists with blockchain explorer

---

### Configuration Key Not Found
**Error Pattern:**
```
Error: Registration contract address not found in configuration (blockchain.contractRegistration)
```

**Root Cause:** Service expects different config key than provided

**Solution:** Check config file format
```ini
# Required format
[blockchain]
contractRegistration=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F

# Common mistakes
[blockchain]  
unifiedContract=0x... # Wrong key name
registrationContract=0x... # Wrong key name
```

**Files to Check:** config-template-localhost.ini, ConfigService.ts

---

## ⚠️ SERVICE STARTUP ERRORS

### Port Already in Use
**Error Pattern:**
```
Error: listen EADDRINUSE: address already in use :::8000
```

**Solution:** 
```bash
# Find process using port
netstat -tulpn | grep :8000
# Kill process
kill -9 [PID]
# Or use different port in config
```

### INI File Not Found
**Error Pattern:**
```
Error: Configuration file not found: ~/.data-wallet/localhost/config.ini
```

**Solution:**
```bash
mkdir -p ~/.data-wallet/localhost
cp config-template-localhost.ini ~/.data-wallet/localhost/config.ini
# Edit with actual values
```

### Private Key Format Error
**Error Pattern:**
```
Error: invalid private key (argument="privateKey", value="YOUR_PRIVATE_KEY_HERE", code=INVALID_ARGUMENT)
```

**Solution:** Update config with actual hex private key (64 chars, no 0x prefix)

---

## 🔗 BLOCKCHAIN CONNECTIVITY ERRORS

### Network Timeout
**Error Pattern:**
```
Error: network timeout (request to https://rpc-amoy.polygon.technology/ failed)
```

**Solutions:**
1. Check internet connectivity
2. Try alternative RPC: `https://polygon-amoy.infura.io/v3/YOUR_KEY`
3. Verify firewall settings
4. Test with curl: `curl https://rpc-amoy.polygon.technology/`

### Insufficient Balance
**Error Pattern:**
```
Error: insufficient funds for intrinsic transaction cost
```

**Solution:** Add POL to service wallet
```bash
# Check balance
curl -X POST https://rpc-amoy.polygon.technology/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a","latest"],"id":1}'

# Get testnet POL from faucet
```

---

## 📧 EMAIL PROCESSING ERRORS

### Microsoft Graph API Authentication
**Error Pattern:**
```
Error: AADSTS7000215: Invalid client secret is provided
```

**Solutions:**
1. Verify client secret VALUE (not ID) from Azure portal
2. Check for trailing spaces in config file
3. Verify tenant ID is correct
4. Ensure Application permissions granted (not Delegated)

### Email Not Found
**Error Pattern:**
```
[EMAIL] No unread emails found for process@rivetz.com
```

**Debugging Steps:**
1. Check email account has unread messages
2. Verify Graph API permissions include Mail.Read
3. Test Graph API directly with access token
4. Check polling interval settings

---

## 🔍 DEBUGGING METHODOLOGY

### Step 1: Health Checks
```bash
# Service health
curl http://localhost:8000/.rootz/status

# Contract connectivity  
curl "http://localhost:8000/.rootz/test/blockchain-write"

# Email service
curl "http://localhost:8000/.rootz/email-monitor/status"
```

### Step 2: Service Logs
```bash
# Real-time logs
sudo journalctl -u email-wallet-service -f

# Recent logs
sudo journalctl -u email-wallet-service --since "10 minutes ago"
```

### Step 3: Configuration Verification
```bash
# Check config file exists
ls ~/.data-wallet/localhost/config.ini

# Verify contract addresses
grep -i contract ~/.data-wallet/localhost/config.ini
```

### Step 4: Direct Contract Testing
```javascript
// test-contract.js
const { ethers } = require('ethers');
const provider = new ethers.providers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');
const contract = new ethers.Contract('0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F', ABI, provider);

// Test function exists
const owner = await contract.owner();
console.log('Contract owner:', owner);
```

---

## 🎯 PREVENTION MEASURES

### Before Making Changes
1. [ ] Check health endpoints
2. [ ] Read recent debugging docs
3. [ ] Verify contract addresses haven't changed
4. [ ] Check if similar issues documented

### After Implementing Fixes  
1. [ ] Test health endpoints again
2. [ ] Verify logs show expected behavior
3. [ ] Document issue and solution
4. [ ] Update prevention measures

### Code Review Checklist
1. [ ] No hardcoded returns without contract calls
2. [ ] Error messages are helpful (not misleading)  
3. [ ] Configuration keys match template
4. [ ] Functions actually called (not just defined in ABI)

This reference should prevent repeating the same debugging cycles!