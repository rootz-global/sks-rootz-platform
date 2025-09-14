# Enhanced EmailDataWallet Contract Deployment Guide

## Overview
This guide covers deploying the enhanced EmailDataWalletOS_Secure contract which includes:
- Comprehensive input validation
- Gas-optimized operations
- Enhanced security features
- Better error handling
- Extended functionality

## Prerequisites
1. Node.js 18+ installed
2. Your service wallet has sufficient POL balance (minimum 1 POL)
3. Private key configured in .env file

## Quick Deployment Steps

### 1. Install Dependencies
```bash
cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"
npm install
```

### 2. Verify Configuration
Ensure your `.env` file contains:
```env
PRIVATE_KEY=36549a7f0853dee1fdad1c432076b12946646ae511a1b54a6d014c17e85d196b
```

### 3. Compile Contract
```bash
npm run hardhat:compile
```

### 4. Deploy to Polygon Amoy
```bash
npm run contract:deploy
```

## Expected Output
```
🚀 Starting EmailDataWalletOS_Secure deployment...
📡 Deploying to network: amoy (80002)
👤 Deploying from account: 0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a
💰 Account balance: 89.79 POL
🔑 Initial owner will be: 0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a

🔨 Deploying EmailDataWalletOS_Secure...
⛽ Estimated gas: 3847291
💨 Gas price: 102.5 gwei
💵 Estimated cost: 0.394 POL

📤 Deployment transaction: 0x1234...
⏳ Waiting for deployment confirmation...

🎉 === DEPLOYMENT SUCCESSFUL ===
📍 Contract Address: 0xNEW_CONTRACT_ADDRESS_HERE
🔗 Transaction Hash: 0x1234...
📦 Block Number: 26380000
⛽ Gas Used: 3847291
💰 Actual Cost: 0.394 POL

✅ Function verified: createEmailDataWallet
✅ Function verified: getEmailDataWallet
✅ Function verified: updateEmailDataWallet
✅ Function verified: getAllUserWallets
✅ Function verified: getActiveWalletCount
✅ Function verified: getTotalWalletCount
✅ Function verified: walletExists

📊 Contract Constants:
   MAX_STRING_LENGTH: 500
   MAX_ATTACHMENT_COUNT: 100
   MAX_WALLETS_PER_USER: 1000
```

## Post-Deployment Steps

### 1. Update Platform Configuration

#### For Ubuntu Server:
```bash
ssh ubuntu@rootz.global
nano ~/.data-wallet/localhost/config.ini

# Update this line:
contractEmailDataWallet=NEW_CONTRACT_ADDRESS_FROM_DEPLOYMENT
```

#### For Windows Development:
```bash
# Update config-template-localhost.ini
contractEmailDataWallet=NEW_CONTRACT_ADDRESS_FROM_DEPLOYMENT
```

### 2. Update BlockchainService.ts
The platform's BlockchainService.ts will automatically use the new contract address from the configuration.

### 3. Test Integration
```bash
# After updating configuration and restarting the platform
curl http://localhost:3000/.rootz/status
curl http://localhost:3000/.rootz/test/blockchain-write
```

## Enhanced Contract Features

### New Functions Available:
- `createEmailDataWallet()` - Enhanced validation and security
- `getEmailDataWallet()` - Retrieve wallet by ID
- `getWalletIdByEmailHash()` - Find wallet by email hash
- `getAllUserWallets()` - Get all wallets for a user
- `getActiveWalletCount()` - Count active wallets per user
- `updateEmailDataWallet()` - Update wallet metadata
- `deactivateWallet()` - Deactivate a wallet
- `getTotalWalletCount()` - Total wallets created
- `walletExists()` - Check if wallet exists
- `pause()`/`unpause()` - Emergency controls

### Security Enhancements:
- Input validation on all parameters
- Maximum string length limits (500 chars)
- Maximum attachment count (100)
- Maximum wallets per user (1000)
- Duplicate email hash prevention
- Access control on updates
- Emergency pause functionality
- Reentrancy protection

### Gas Optimizations:
- Custom errors for gas efficiency
- Optimized storage layout
- Efficient loops and operations
- Proper use of storage vs memory

## Troubleshooting

### Common Issues:

#### 1. Compilation Errors
```bash
# Clear cache and retry
npx hardhat clean
npm run hardhat:compile
```

#### 2. Deployment Failures
```bash
# Check balance
npx hardhat run scripts/check-balance.js --network amoy

# Verify network connectivity
curl https://rpc-amoy.polygon.technology/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### 3. Gas Estimation Issues
The enhanced contract includes comprehensive validation. Ensure:
- All string parameters are under 500 characters
- Attachment count is under 100
- Hash parameters are not empty
- User address is valid

## Contract Verification (Optional)
```bash
# After deployment, verify on PolygonScan
npx hardhat verify --network amoy NEW_CONTRACT_ADDRESS_HERE "0xE2d0E252E7da22901bd1ffDD012Da2c77aC3033a"
```

## Files Created/Modified
- `/contracts/active/EmailDataWalletOS_Secure.sol` - Enhanced contract
- `/contracts/deployment/scripts/deploy-enhanced-email-wallet.js` - Deployment script
- `/hardhat.config.js` - Hardhat configuration
- `.env` - Environment variables
- `package.json` - Added Hardhat dependencies and scripts

## Next Steps After Deployment
1. Test complete email processing workflow
2. Verify enhanced validation works as expected
3. Test new functions like `getActiveWalletCount()` and `getAllUserWallets()`
4. Monitor gas usage improvements
5. Test emergency pause/unpause functionality

The enhanced contract provides a robust foundation for the email wallet system with comprehensive security, validation, and functionality improvements.
