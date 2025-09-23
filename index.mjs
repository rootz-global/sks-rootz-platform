import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Epistery } from 'epistery';
import http from "http";
import https from "https";
import fs from "fs";
import { Config } from './src/core/configuration/Config.js';
import { MySQLService } from './src/services/database/MySQLService.js';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = express();

  // Initialize configuration
  const config = new Config();
  const domain = process.env.DOMAIN || 'localhost';
  config.loadDomain(domain);

  // Initialize database service for OCI MySQL
  const dbService = new MySQLService(config);
  try {
    await dbService.initialize();
  } catch (error) {
    console.warn('⚠️  Database initialization failed, continuing without database:', error.message);
  }

  // Attach Epistery directly to app
  const epistery = await Epistery.connect();
  await epistery.attach(app);

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files (CSS, images, etc.)
  app.use('/public', express.static(path.join(__dirname, 'public')));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = {
      status: 'ok', 
      service: 'rootz-platform',
      domain: domain,
      timestamp: new Date().toISOString(),
      database: { healthy: false, details: 'Not initialized' }
    };

    if (dbService) {
      health.database = await dbService.healthCheck();
    }

    res.json(health);
  });

  // Default route
  app.get('/', (req, res) => {
    res.json({
      message: 'Rootz Platform - Email Data Wallet Service',
      domain: domain,
      status: 'running',
      features: [
        'Email wallet creation',
        'Data signing',
        'Blockchain integration',
        'IPFS storage'
      ]
    });
  });

  const PORT = process.env.PORT || 4080;
  const HTTPS_PORT = process.env.HTTPS_PORT || 4443;

  // HTTP Server
  const http_server = http.createServer(app);
  http_server.listen(PORT);
  http_server.on('error', console.error);
  http_server.on('listening', () => {
    let address = http_server.address();
    console.log(`🚀 Rootz Platform HTTP: Listening on ${address.address} ${address.port} (${address.family})`);
  });

  // HTTPS Server (if SSL certificates are available)
  const sslCertPath = config.get('platform.sslCertPath');
  const sslKeyPath = config.get('platform.sslKeyPath');
  
  if (sslCertPath && sslKeyPath && fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath)) {
    try {
      const options = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };
      
      const https_server = https.createServer(options, app);
      https_server.listen(HTTPS_PORT);
      https_server.on('error', console.error);
      https_server.on('listening', () => {
        let address = https_server.address();
        console.log(`🔒 Rootz Platform HTTPS: Listening on ${address.address} ${address.port} (${address.family})`);
      });
    } catch (error) {
      console.warn('⚠️  SSL certificates found but failed to load HTTPS server:', error.message);
    }
  }

  console.log(`🌐 Rootz Platform: HTTP server running at http://localhost:${PORT}`);
  if (sslCertPath && sslKeyPath) {
    console.log(`🔒 Rootz Platform: HTTPS server running at https://localhost:${HTTPS_PORT}`);
  }
}

main().catch(err => {
  console.error('❌ Rootz Platform failed to start:', err);
  process.exit(1);
});