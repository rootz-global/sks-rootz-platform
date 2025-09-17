#!/bin/bash
# deploy-registration-fix.sh
# Deploy the RegistrationLookupService fix to resolve hardcoded null returns

echo "🔧 DEPLOYING REGISTRATION LOOKUP FIX"
echo "======================================"
echo "Issue: RegistrationLookupService hardcoded to return null"
echo "Fix: Actually call contract.getWalletFromEmail()"
echo ""

PROJECT_DIR="C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"
cd "$PROJECT_DIR"

echo "📋 Project Directory: $(pwd)"
echo ""

# Step 1: Show what's changed
echo "🔍 Step 1: Files to deploy"
echo "---------------------------"
echo "✅ src/services/RegistrationLookupService.ts (FIXED - now calls contract)"
echo "✅ docs/debugging/2025-09-17-registration-lookup-hardcoded-null.md (documentation)"
echo "✅ docs/contracts/EmailWalletRegistration-ABI.md (contract reference)"
echo "✅ docs/troubleshooting/common-errors.md (prevention guide)"
echo "✅ AI_DEBUGGING_GUIDE.md (master reference)"
echo ""

# Step 2: Commit changes
echo "💾 Step 2: Committing changes"
echo "------------------------------"
git status
echo ""

git add src/services/RegistrationLookupService.ts
git add docs/debugging/2025-09-17-registration-lookup-hardcoded-null.md
git add docs/contracts/EmailWalletRegistration-ABI.md
git add docs/troubleshooting/common-errors.md
git add AI_DEBUGGING_GUIDE.md

git commit -m "CRITICAL FIX: Registration lookup service now calls contract

Root Cause:
- RegistrationLookupService.getWalletByEmail() hardcoded to return null
- Service never called contract.getWalletFromEmail() despite function existing
- Contract at 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F HAS working function

Fix Applied:
- Remove hardcoded null return
- Actually call this.registrationContract.getWalletFromEmail(email)
- Use correct config key: blockchain.contractRegistration
- Add proper error handling and zero address check
- Use EmailWalletRegistration ABI (not unified ABI)

Documentation Added:
- Complete issue analysis in docs/debugging/
- Contract function reference in docs/contracts/
- Common errors guide in docs/troubleshooting/
- AI debugging guide in project root for future sessions

Expected Result:
- Email processing pipeline now works for registered users
- Service logs show SUCCESS messages instead of hardcoded warnings
- Complete email-to-blockchain wallet creation flow functional

This was a service code bug, not a contract issue. The deployed contract 
worked perfectly - the service just wasn't calling it."

echo ""

# Step 3: Push to remote
echo "🚀 Step 3: Pushing to remote repository"
echo "---------------------------------------"
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to remote"
else
    echo "❌ Push failed - check git status"
    exit 1
fi

echo ""

# Step 4: Server deployment instructions
echo "🖥️  Step 4: SERVER DEPLOYMENT REQUIRED"
echo "======================================"
echo ""
echo "SSH to server and run:"
echo ""
echo "  ssh ubuntu@rootz.global"
echo "  cd /opt/sks-rootz-platform"
echo "  git pull origin main"
echo "  npm run build"
echo "  npm start"
echo ""

# Step 5: Verification commands
echo "✅ Step 5: VERIFICATION COMMANDS"
echo "================================"
echo ""
echo "After server restart, test these:"
echo ""
echo "Service health (should start without errors):"
echo "  curl http://localhost:8000/.rootz/status"
echo ""
echo "Registration lookup (should return wallet, not null):"
echo "  curl \"http://localhost:8000/.rootz/test/registration-lookup?email=steven@rivetz.com\""
echo ""
echo "Expected success logs:"
echo "  [REGISTRATION] FIXED: Will actually call getWalletFromEmail() function"
echo "  [REGISTRATION] SUCCESS: Found wallet 0x107... for email: steven@rivetz.com"
echo ""

echo "🎯 SUCCESS CRITERIA"
echo "==================="
echo "✅ Service starts without contract address errors"
echo "✅ Email lookup returns wallet address (not null)"
echo "✅ Service logs show SUCCESS instead of WARNING messages"
echo "✅ Email processing pipeline works for registered users"
echo ""

echo "📚 DOCUMENTATION CREATED"
echo "========================"
echo "Future AI debugging sessions can reference:"
echo "• AI_DEBUGGING_GUIDE.md (start here)"
echo "• docs/debugging/ (specific issues)"
echo "• docs/contracts/ (contract references)"
echo "• docs/troubleshooting/ (common problems)"
echo ""

echo "🔥 KEY LESSON LEARNED"
echo "====================="
echo "Always check service code before assuming contract issues!"
echo "The deployed contract worked perfectly - service wasn't calling it."
echo ""

echo "📋 DEPLOYMENT COMPLETE - Server restart required"