// SKS Rootz Platform - Main Entry Point
// EPISTERY-style service that attaches to existing infrastructure

import express from 'express';
import { RootzPlatform } from './rootz-platform.js';

async function main() {
  try {
    console.log('🚀 Starting SKS Rootz Platform...');
    
    // Initialize platform (EPISTERY pattern)
    const rootz = await RootzPlatform.connect();
    
    // Create or attach to existing Express app
    const app = express();
    
    // Attach platform to app (non-invasive)
    await rootz.attach(app);
    
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`✅ SKS Rootz Platform listening on port ${port}`);
      console.log(`📡 Service APIs available at: /.rootz/`);
      console.log(`📚 Client library available at: /.rootz/lib/rootz-client.js`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start SKS Rootz Platform:', error);
    process.exit(1);
  }
}

main().catch(console.error);
