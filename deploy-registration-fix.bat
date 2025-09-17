@echo off
REM deploy-registration-fix.bat
REM Deploy the RegistrationLookupService fix

echo 🔧 PUSHING REGISTRATION LOOKUP FIX
echo ======================================
echo Issue: RegistrationLookupService hardcoded to return null
echo Fix: Actually call contract.getWalletFromEmail()
echo.

cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"

echo 📋 Current directory: %CD%
echo.

REM Step 1: Check git status
echo 🔍 Step 1: Checking git status
echo ------------------------------
git status
echo.

REM Step 2: Stage files
echo 📝 Step 2: Staging files
echo -------------------------
git add src/services/RegistrationLookupService.ts
git add AI_DEBUGGING_GUIDE.md
git add docs/debugging/2025-09-17-registration-lookup-hardcoded-null.md
git add docs/contracts/EmailWalletRegistration-ABI.md
git add docs/troubleshooting/common-errors.md
git add deploy-registration-fix.sh
git add test-registration-lookup.js

echo ✅ Files staged
echo.

REM Step 3: Commit with detailed message
echo 💾 Step 3: Committing changes
echo ------------------------------
git commit -m "CRITICAL FIX: Registration lookup service now calls contract

Root Cause Analysis:
- RegistrationLookupService.getWalletByEmail() was hardcoded to return null
- Service never called contract.getWalletFromEmail() despite function existing
- Contract at 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F HAS working function
- Systematic code analysis revealed service code bug, not contract issue

Fix Applied:
- Remove hardcoded null return in RegistrationLookupService.ts
- Actually call this.registrationContract.getWalletFromEmail(email)
- Use correct config key: blockchain.contractRegistration
- Add proper error handling and zero address check
- Use EmailWalletRegistration ABI (not unified contract ABI)

Documentation Added:
- AI_DEBUGGING_GUIDE.md - Master reference for future debugging
- docs/debugging/ - Complete issue analysis with root cause
- docs/contracts/ - Contract function reference and ABI  
- docs/troubleshooting/ - Common errors and prevention guide
- test-registration-lookup.js - Contract verification test

Expected Result:
- Email processing pipeline works for registered users
- Service logs show SUCCESS instead of hardcoded WARNING messages
- Complete email-to-blockchain wallet creation flow functional
- Future debugging sessions reference comprehensive documentation

Key Learning: Always check service code before assuming contract issues.
The deployed contract worked perfectly - service just wasn't calling it."

echo.

REM Step 4: Push to remote
echo 🚀 Step 4: Pushing to remote repository
echo -----------------------------------------
git push origin main

if %ERRORLEVEL% == 0 (
    echo ✅ Successfully pushed to remote!
    echo.
    
    echo 🖥️  NEXT: SERVER DEPLOYMENT REQUIRED
    echo ====================================
    echo SSH to server and run:
    echo   ssh ubuntu@rootz.global
    echo   cd /opt/sks-rootz-platform
    echo   git pull origin main
    echo   npm run build
    echo   npm start
    echo.
    
    echo ✅ VERIFICATION COMMANDS AFTER SERVER RESTART:
    echo ===============================================
    echo Service health:
    echo   curl http://localhost:8000/.rootz/status
    echo.
    echo Registration lookup ^(should return wallet, not null^):
    echo   curl "http://localhost:8000/.rootz/test/registration-lookup?email=steven@rivetz.com"
    echo.
    echo Expected success logs:
    echo   [REGISTRATION] FIXED: Will actually call getWalletFromEmail() function
    echo   [REGISTRATION] SUCCESS: Found wallet 0x107... for email: steven@rivetz.com
    echo.
    
    echo 🎯 SUCCESS CRITERIA:
    echo ====================
    echo ✅ Service starts without contract address errors
    echo ✅ Email lookup returns wallet address ^(not null^)
    echo ✅ Service logs show SUCCESS instead of WARNING messages
    echo ✅ Email processing pipeline works for registered users
    
) else (
    echo ❌ Push failed - check git status and try again
    git status
)

echo.
echo 📋 DEPLOYMENT SCRIPT COMPLETE
pause
