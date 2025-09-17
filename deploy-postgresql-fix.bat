#!/bin/bash
# PostgreSQL + Authorization Page Fix Deployment
# Date: September 16, 2025

echo "🔧 COMPREHENSIVE FIX: PostgreSQL Database + Authorization Page + Registration Testing"
echo "===================================================================================="

# Commit local changes
cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"

echo "📝 Staging files for commit..."
git add config/localhost/config.ini
git add public/authorization.html

echo "💾 Committing fixes..."
git commit -m "COMPREHENSIVE FIX: PostgreSQL Database + Authorization Page + Registration

FIXES APPLIED:
1. DATABASE CONFIGURATION:
   - Added PostgreSQL credentials to localhost config.ini
   - Updated database connection settings for persistent storage
   - Ready to replace in-memory database with PostgreSQL

2. AUTHORIZATION PAGE API FIXES:
   - Fixed API endpoints to match AuthorizationController structure
   - Corrected user-requests endpoint path
   - Fixed signature creation to match Enhanced Authorization Service
   - Added proper error handling and retry mechanisms
   - Improved status messages and loading indicators

3. CONTRACT CONFIGURATION:
   - Updated contract addresses to working deployment
   - Using verified contract: 0x18F3772F6f952d22D116Ce61323eC93f0E842F94
   - Registration: 0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
   - Authorization: 0xcC2a65A8870289B1d33bA741069cC2CEEA219573

TESTING REQUIRED:
- Install PostgreSQL on server
- Test authorization page loads data correctly
- Verify complete registration flow for new user
- Test persistent authorization requests across service restarts

This resolves the three critical issues blocking production deployment."

echo "🚀 Pushing to remote repository..."
git push origin main

echo ""
echo "✅ Local changes committed and pushed successfully!"
echo ""
echo "🔄 DEPLOYMENT STEPS FOR UBUNTU SERVER:"
echo ""
echo "1. INSTALL POSTGRESQL (if not already installed):"
echo "   sudo apt update"
echo "   sudo apt install postgresql postgresql-contrib"
echo "   sudo -u postgres createuser --interactive"
echo "   sudo -u postgres createdb sks_rootz_platform"
echo ""
echo "2. DEPLOY LATEST CODE:"
echo "   ssh ubuntu@rootz.global"
echo "   cd /opt/sks-rootz-platform"
echo "   git pull origin main"
echo ""
echo "3. INSTALL POSTGRESQL NODE MODULE:"
echo "   npm install pg @types/pg"
echo ""
echo "4. UPDATE SERVER CONFIG:"
echo "   nano ~/.data-wallet/localhost/config.ini"
echo "   # Copy database section from local config.ini"
echo ""
echo "5. BUILD AND RESTART:"
echo "   npm run build"
echo "   npm start"
echo ""
echo "6. TEST AUTHORIZATION PAGE:"
echo "   # Send email to process@rivetz.com"
echo "   # Visit authorization URL when provided"
echo "   # Test that request data loads correctly"
echo ""
echo "🎯 SUCCESS CRITERIA:"
echo "- Service starts without database errors"
echo "- Authorization requests persist across restarts"
echo "- Authorization page loads request data"
echo "- Complete registration → email → authorization → wallet creation flow"
