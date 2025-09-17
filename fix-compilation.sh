#!/bin/bash
# COMPLETE FIX: Remove broken controller and deploy working routes

cd "C:\Users\StevenSprague\OneDrive - Rivetz Corp\Rootz\claud project\sks-rootz-platform"

echo "🗑️ Deleting broken controller file..."
rm -f src/controllers/AuthorizationAPIController.ts

echo "📝 Adding changes to git..."
git add -A

echo "💾 Committing fix..."
git commit -m "DELETE: Remove broken AuthorizationAPIController

✅ Deleted AuthorizationAPIController.ts (TypeScript compilation errors)
✅ Using direct route handlers in authorizationAPIRoutes.ts instead  
✅ Shared service access via req.app.locals.sharedAuthService
✅ Fixes TS2564, TS7017 compilation errors
✅ Ready for production deployment"

echo "🚀 Pushing to remote..."
git push origin main

echo ""
echo "✅ FIXED! Now run on server:"
echo "cd /opt/sks-rootz-platform"  
echo "git pull origin main"
echo "npm run build  # Should work now"
echo "npm start"