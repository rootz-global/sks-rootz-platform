@echo off
REM TypeScript compilation fix for registration lookup service

echo FIXING TypeScript compilation errors...
echo ==========================================

cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"

echo.
echo Staging TypeScript fixes...
git add src/services/RegistrationLookupService.ts
git add src/controllers/RegistrationTestController.ts

echo.
echo Committing TypeScript fixes...
git commit -m "FIX: TypeScript compilation errors in registration lookup service

- Fix Config import path: '../core/Config' -> '../core/configuration/Config'  
- Add proper return types (Promise<void>) to controller methods
- Fix error handling with proper TypeScript error type checking
- Add explicit return statements for all code paths

Resolves 7 TypeScript compilation errors:
- TS2307: Cannot find module '../core/Config'
- TS7030: Not all code paths return a value  
- TS18046: 'error' is of type 'unknown'"

echo.
echo Pushing fixes to remote repository...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: TypeScript compilation fixes pushed!
    echo.
    echo Now run on Ubuntu server:
    echo cd /opt/sks-rootz-platform
    echo git pull origin main
    echo npm run build
    echo npm start
) else (
    echo.
    echo ERROR: Git push failed. Check git status.
)

pause
