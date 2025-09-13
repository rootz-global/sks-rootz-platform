# SKS Rootz Platform - Deployment Note

**Date:** September 12, 2025  
**Version:** v1.1.0 - Email Processing Integration  
**Status:** 🚀 Ready for Deployment  

## 📦 Deployment Package Contents

### **New Features Added**
- **Complete Email Processing Pipeline** - Raw email to blockchain wallet workflow
- **Local IPFS Integration** - Decentralized storage for email content
- **Blockchain Authorization System** - User consent via MetaMask signatures
- **Smart Contract Documentation** - Active contracts with deployment details

### **Files Ready for Deployment**
```
✅ Email Processing Services (3 services)
✅ IPFS Storage Integration (local node)
✅ Authorization Service (blockchain)
✅ API Controllers & Routes (5 endpoints)
✅ Smart Contract Documentation (active deployments)
✅ Comprehensive Testing Suite
✅ Updated Dependencies (package.json)
✅ Configuration Templates
```

## 🛠️ Pre-Deployment Requirements

### **Ubuntu Server Prerequisites**
1. **Install Local IPFS Node**
   ```bash
   # Download and install IPFS
   wget https://dist.ipfs.io/kubo/v0.22.0/kubo_v0.22.0_linux-amd64.tar.gz
   tar -xzf kubo_v0.22.0_linux-amd64.tar.gz
   sudo mv kubo/ipfs /usr/local/bin/
   
   # Initialize and start IPFS
   ipfs init
   ipfs daemon --enable-gc &
   
   # Verify IPFS running
   curl http://localhost:5001/api/v0/id
   ```

2. **Update Configuration**
   ```bash
   # Update platform configuration
   nano ~/.data-wallet/rootz.global/config.ini
   
   # Add IPFS configuration
   [ipfs]
   localUrl=http://localhost:5001
   gatewayUrl=http://localhost:8080
   
   [blockchain]
   serviceWalletPrivateKey=YOUR_ACTUAL_SERVICE_WALLET_KEY
   contractAuthorization=0xcC2a65A8870289B1d33bA741069cC2CEEA219573
   rpcUrl=https://rpc-amoy.polygon.technology/
   ```

3. **Install New Dependencies**
   ```bash
   npm install mailparser ipfs-http-client
   npm install --save-dev @types/mailparser
   ```

## 🚀 Deployment Steps

### **Step 1: Git Operations**
```bash
# On local machine - commit and push changes
cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"
git add .
git commit -m "FEAT: Complete Email Processing + IPFS + Authorization Integration

- Add EmailParser service for raw email processing
- Add LocalIPFSService for decentralized storage
- Add AuthorizationService for blockchain integration
- Add EmailProcessingController for workflow orchestration
- Add smart contract documentation and ABIs
- Add comprehensive test suite
- Update dependencies for mailparser and IPFS
- Create API endpoints for email processing workflow"

git push origin main
```

### **Step 2: Server Deployment**
```bash
# On Ubuntu server (rootz.global)
cd /opt/sks-rootz-platform
git pull origin main

# Install new dependencies
npm install

# Build TypeScript
npm run build

# Test configuration
node -e "const {Config} = require('./dist/core/configuration'); const c = new Config(); c.loadDomain('rootz.global'); console.log('Config loaded successfully');"
```

### **Step 3: Service Testing**
```bash
# Test IPFS connectivity
curl http://localhost:5001/api/v0/id

# Test email processing health
curl http://localhost:3000/.rootz/email-processing/health

# Run test suite
npm run test:email-processing
```

## 📊 Deployment Verification Checklist

### **✅ Infrastructure Ready**
- [ ] IPFS node installed and running on port 5001
- [ ] Service wallet has sufficient POL balance (89+ POL confirmed)
- [ ] Smart contracts deployed and accessible
- [ ] Configuration files updated with actual values

### **✅ Application Ready** 
- [ ] Git repository updated with latest code
- [ ] Dependencies installed (mailparser, ipfs-http-client)
- [ ] TypeScript compiled successfully
- [ ] Configuration loaded without errors

### **✅ Services Operational**
- [ ] Platform responds on port 3000
- [ ] Email processing health check passes
- [ ] IPFS connectivity verified
- [ ] Blockchain authorization service healthy

### **✅ Testing Complete**
- [ ] Email parsing test passes
- [ ] IPFS upload/download test passes  
- [ ] Authorization request creation test passes
- [ ] End-to-end workflow test passes

## 🧪 Test Commands Post-Deployment

### **Basic Health Checks**
```bash
# Platform status
curl http://localhost:3000/.rootz/status

# Email processing health
curl http://localhost:3000/.rootz/email-processing/health

# IPFS node status
curl http://localhost:5001/api/v0/id
```

### **Email Processing Test**
```bash
# Test email parsing (no blockchain operations)
curl -X POST http://localhost:3000/.rootz/email-processing/test-parse \
  -H "Content-Type: application/json" \
  -d '{"rawEmail":"From: test@example.com\nSubject: Test\n\nTest email content"}'
```

### **Full Workflow Test**
```bash
# Complete email processing workflow
curl -X POST http://localhost:3000/.rootz/email-processing/process \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b",
    "rawEmail": "From: demo@techcorp.com\nTo: user@rootz.global\nSubject: Test Email for DATA_WALLET Creation\n\nThis is a test email for blockchain wallet creation.",
    "notifyUser": true
  }'
```

## 📋 Expected Results

### **Successful Deployment Indicators**
1. **✅ Platform Startup**
   ```
   🚀 Starting SKS Rootz Platform...
   🔧 Initializing Email Processing Controller...
   🔌 Connecting to local IPFS node at http://localhost:5001
   ✅ Connected to IPFS node: 12D3KooWXXXXXXXXXXXXXXXX
   ✅ Authorization service initialized
   ✅ SKS Rootz Platform listening on port 3000
   ```

2. **✅ Health Check Response**
   ```json
   {
     "healthy": true,
     "services": {
       "ipfs": {"healthy": true, "details": {"nodeId": "12D3KooW..."}},
       "authorization": {"healthy": true, "details": {"balance": "89.79 POL"}},
       "emailParser": {"healthy": true}
     }
   }
   ```

3. **✅ Successful Email Processing**
   ```json
   {
     "success": true,
     "requestId": "0xa02a5d844029f5e4f7617daf29012019ab7e9b78",
     "authToken": "0x1234567890abcdef",
     "ipfsHash": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     "authorizationUrl": "http://rootz.global/.email-admin/authorization.html?token=..."
   }
   ```

## ⚠️ Troubleshooting

### **IPFS Issues**
```bash
# Check IPFS daemon status
ps aux | grep ipfs

# Restart IPFS if needed
pkill ipfs
ipfs daemon --enable-gc &

# Check IPFS logs
tail -f ~/.ipfs/logs/*
```

### **Configuration Issues**
```bash
# Verify configuration loading
node -e "
const {Config} = require('./dist/core/configuration');
const c = new Config();
c.loadDomain('rootz.global');
console.log('Service wallet:', c.get('SERVICE_WALLET_PRIVATE_KEY') ? '[PRESENT]' : '[MISSING]');
console.log('Auth contract:', c.get('CONTRACT_AUTHORIZATION'));
console.log('IPFS URL:', c.get('IPFS_LOCAL_URL'));
"
```

### **Network Issues**
```bash
# Test RPC connectivity
curl -X POST https://rpc-amoy.polygon.technology/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## 🎯 Success Criteria

**Deployment is successful when:**
1. ✅ Platform starts without errors
2. ✅ All health checks return healthy status  
3. ✅ Email parsing test completes successfully
4. ✅ IPFS connectivity confirmed
5. ✅ Blockchain authorization service operational
6. ✅ Complete email processing workflow executes

## 📞 Post-Deployment Actions

### **Immediate (First 24 Hours)**
- Monitor service logs for any errors
- Test email processing with sample data
- Verify IPFS content persistence
- Confirm blockchain transactions completing

### **Short Term (First Week)**  
- Monitor resource usage (CPU, memory, disk)
- Test various email formats and sizes
- Verify IPFS garbage collection working
- Monitor blockchain gas usage patterns

### **Medium Term (First Month)**
- Implement monitoring and alerting
- Optimize IPFS node configuration
- Monitor email processing performance
- Plan integration with email monitoring

---

## 📝 Deployment Summary

**Package Contents:** Complete Email Processing + IPFS + Authorization system  
**New Services:** 4 major services with 5 API endpoints  
**Dependencies:** mailparser, ipfs-http-client  
**Infrastructure:** Requires local IPFS node  
**Testing:** Comprehensive test suite included  
**Documentation:** Complete implementation guide  

**🚀 Ready for deployment to Ubuntu server at rootz.global!**

---

**Created:** September 12, 2025  
**Contact:** See repository maintainers for deployment support
