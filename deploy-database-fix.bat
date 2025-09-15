#!/bin/bash
# Database JSON Parsing Fix Deployment
# Date: September 15, 2025

echo "🚨 CRITICAL FIX: Deploying database JSON parsing fix"
echo "=================================================="

# Navigate to project directory
cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"

echo "📋 Checking git status..."
git status

echo ""
echo "📝 Staging files for commit..."
git add src/services/database/DatabaseService.ts
git add DATABASE_JSON_FIX.md

echo ""
echo "💾 Committing critical fix..."
git commit -m "CRITICAL FIX: Database JSON parsing handles malformed email data

- Fix mapRowToAuthorizationRequest() to handle '[object Object]' strings gracefully
- Add comprehensive error handling for JSONB parsing
- Provide fallback values when email data is malformed  
- Resolve SyntaxError: Unexpected end of JSON input in authorization API
- Enable authorization requests to be retrieved correctly from database

Fixes authorization page 404 errors - requests are saved but weren't retrievable
due to email headers being serialized as '[object Object]' strings instead of
proper JSON objects."

echo ""
echo "🚀 Pushing to remote repository..."
git push origin main

echo ""
echo "✅ Database JSON parsing fix committed and pushed successfully!"
echo ""
echo "🔄 Next steps:"
echo "1. SSH to Ubuntu server: ssh ubuntu@rootz.global"
echo "2. Pull latest changes: cd /opt/sks-rootz-platform && git pull origin main"
echo "3. Build TypeScript: npm run build"
echo "4. Restart service: npm start"
echo "5. Test authorization API:"
echo "   curl 'http://localhost:8000/.rootz/authorization/request/0x82b6edb58c0be60caeb4d55c406f7e3fe8f2b142760e61e3f3857f90cd14bf40'"
echo ""
echo "Expected result: Authorization request details returned instead of JSON parsing error"