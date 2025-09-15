@echo off
REM Git workflow for registration lookup implementation

echo CRITICAL FIX: Adding Registration Lookup Service and test endpoints
echo ==================================================================

cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"

echo.
echo Staging files for commit...
git add src/services/RegistrationLookupService.ts
git add src/controllers/RegistrationTestController.ts
git add src/routes/testRoutes.ts
git add REGISTRATION_LOOKUP_IMPLEMENTATION.md

echo.
echo Committing registration lookup service...
git commit -m "CRITICAL FIX: Add Registration Lookup Service for proper email-to-wallet mapping

- Add RegistrationLookupService.ts for email-to-wallet address lookup via registration contract
- Add RegistrationTestController.ts with test endpoints for debugging registration issues
- Update testRoutes.ts to include registration test endpoints
- Add documentation in REGISTRATION_LOOKUP_IMPLEMENTATION.md

Test endpoints added:
- GET /.rootz/test/registration-lookup?email=steven@sprague.com
- GET /.rootz/test/user-registration?address=0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b  
- GET /.rootz/test/validate-mapping?email=steven@sprague.com&wallet=0x107C...

FIXES: Contract rejection issues caused by parsing wallet addresses from email subjects
instead of using proper registration contract lookup. Enhanced contract validates
registration, so email processing must use registered email-to-wallet mappings."

echo.
echo Pushing to remote repository...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Registration lookup service committed and pushed!
    echo.
    echo Next steps:
    echo 1. SSH to Ubuntu server: ssh ubuntu@rootz.global
    echo 2. Pull changes: cd /opt/sks-rootz-platform && git pull origin main  
    echo 3. Build TypeScript: npm run build
    echo 4. Restart service: npm start
    echo 5. Test registration lookup: curl "http://localhost:8000/.rootz/test/registration-lookup?email=steven@sprague.com"
    echo.
    echo Expected result: Should return wallet address if registered, null if not registered
) else (
    echo.
    echo ERROR: Git push failed. Check git status and try again.
)

pause
