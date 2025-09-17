#!/bin/bash
# deploy-email-monitoring-fix.sh
# Fix GraphEmailMonitorService to use working RegistrationLookupService

echo "🔧 DEPLOYING EMAIL MONITORING LOOKUP FIX"
echo "=========================================="
echo "Issue: GraphEmailMonitorService using direct contract calls instead of fixed RegistrationLookupService"
echo "Fix: Update to use the same working RegistrationLookupService"
echo ""

PROJECT_DIR="C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"
cd "$PROJECT_DIR"

echo "📋 Project Directory: $(pwd)"
echo ""

# Stage and commit the fix
echo "📝 Staging GraphEmailMonitorService fix..."
git add src/services/GraphEmailMonitorService.ts

git commit -m "FIX: GraphEmailMonitorService now uses working RegistrationLookupService

Issue: Email monitoring was using direct blockchain contract calls instead
of the fixed RegistrationLookupService, causing email processing failures.

Root Cause:
- GraphEmailMonitorService.determineRecipientWallet() called contract directly
- Did not use the RegistrationLookupService that was already fixed
- This caused different behavior between test endpoints (working) and email processing (broken)

Fix Applied:
- Import RegistrationLookupService in GraphEmailMonitorService
- Replace direct contract calls with registrationLookupService.getWalletByEmail()
- Use the same working lookup method across all services
- Added initialization logging to confirm fix is active

Expected Result:
- Email processing now finds registered wallets correctly
- Same behavior between test endpoints and email processing
- Complete email-to-blockchain pipeline functional

Files Changed:
- src/services/GraphEmailMonitorService.ts - Use fixed RegistrationLookupService"

echo "✅ Changes committed"
echo ""

# Push to remote
echo "🚀 Pushing to remote repository..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to remote"
else
    echo "❌ Push failed - check git status"
    exit 1
fi

echo ""
echo "🖥️  NEXT: SERVER DEPLOYMENT REQUIRED"
echo "===================================="
echo "SSH to server and run:"
echo "  ssh ubuntu@rootz.global"
echo "  cd /opt/sks-rootz-platform"
echo "  git pull origin main"
echo "  npm run build"
echo ""
echo "🔄 RESTART SERVICE:"
echo "==================="
echo "  # Kill current service"
echo "  ps aux | grep 'node dist/index.js'"
echo "  sudo kill [PID]"
echo "  # Restart with latest code"
echo "  npm start"
echo ""
echo "✅ VERIFICATION AFTER RESTART:"
echo "=============================="
echo "  # Should show: 'GraphEmailMonitorService initialized with FIXED RegistrationLookupService'"
echo "  # Email processing should now find registered wallets"
echo ""
echo "📧 TEST EMAIL PROCESSING:"
echo "========================="
echo "  # Send email to process@rivetz.com from steven@rivetz.com"
echo "  # Should now show: 'Found registered wallet for steven@rivetz.com: 0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77'"
echo ""

echo "📋 DEPLOYMENT SCRIPT COMPLETE"