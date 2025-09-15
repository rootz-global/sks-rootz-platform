@echo off
REM Final Config class fix for registration lookup service

echo FIXING Config class instantiation...
echo ====================================

cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"

echo.
echo Staging Config fix...
git add src/services/RegistrationLookupService.ts

echo.
echo Committing Config instantiation fix...
git commit -m "FIX: Correct Config class instantiation in RegistrationLookupService

- Fix Config usage: new Config() instead of Config.getInstance() 
- Properly load domain configuration with config.loadDomain()
- Use config.get() method for retrieving configuration values
- Add fallback values for RPC URL and contract addresses
- Add error handling for missing contract configuration
- Add initialization logging for debugging

This matches the actual Config class implementation which does not use singleton pattern."

echo.
echo Pushing Config fix to remote repository...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Config instantiation fix pushed!
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
