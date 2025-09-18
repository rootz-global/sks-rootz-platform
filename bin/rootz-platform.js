#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const program = new Command();

program
  .name('rootz-platform')
  .description('SKS Rootz Platform CLI - Email Wallet & Blockchain Services')
  .version('1.0.0');

// Initialize command
program
  .command('init')
  .description('Initialize a new Rootz Platform installation')
  .option('-d, --domain <domain>', 'Domain name')
  .option('-q, --quick-start', 'Quick start with defaults')
  .option('-p, --production', 'Production environment setup')
  .action(async (options) => {
    console.log(chalk.blue.bold('🚀 SKS Rootz Platform Installer'));
    console.log(chalk.blue('📧 Email Wallet • 🔐 Secrets Management • 🤖 AI Data Wallet'));
    console.log('='.repeat(60));
    
    let config = {};
    
    if (options.quickStart) {
      config = {
        domain: 'localhost',
        environment: 'development',
        port: 8000,
        emailService: 'graph',
        blockchain: 'amoy'
      };
      console.log(chalk.yellow('⚡ Quick start mode - using defaults'));
    } else {
      // Interactive setup
      console.log(chalk.cyan('\\n🛠️  Interactive Setup'));
      config = await inquirer.prompt([
        {
          type: 'input',
          name: 'domain',
          message: 'What is your domain name?',
          default: 'localhost',
          validate: (input) => input.length > 0 || 'Domain name is required'
        },
        {
          type: 'list',
          name: 'environment',
          message: 'Select environment:',
          choices: [
            { name: '🧪 Development (localhost)', value: 'development' },
            { name: '🚧 Staging (testing)', value: 'staging' },
            { name: '🚀 Production (live)', value: 'production' }
          ]
        },
        {
          type: 'number',
          name: 'port',
          message: 'Port number for the platform:',
          default: 8000,
          validate: (input) => (input > 1000 && input < 65535) || 'Port must be between 1000-65535'
        },
        {
          type: 'list',
          name: 'emailService',
          message: 'Email monitoring service:',
          choices: [
            { name: '📧 Microsoft Graph API (Office 365)', value: 'graph' },
            { name: '📮 IMAP (Traditional)', value: 'imap' }
          ]
        },
        {
          type: 'list',
          name: 'blockchain',
          message: 'Blockchain network:',
          choices: [
            { name: '🟣 Polygon Amoy (Testnet)', value: 'amoy' },
            { name: '🔵 Polygon Mainnet', value: 'polygon' },
            { name: '🟡 Local Hardhat', value: 'local' }
          ]
        },
        {
          type: 'confirm',
          name: 'setupSSL',
          message: 'Setup SSL certificates (production only)?',
          default: false,
          when: (answers) => answers.environment === 'production'
        }
      ]);
    }
    
    const spinner = ora(chalk.blue('Setting up SKS Rootz Platform...')).start();
    
    try {
      // Create configuration directory (EPISTERY pattern)
      const configDir = path.join(os.homedir(), '.data-wallet', config.domain);
      await fs.ensureDir(configDir);
      
      spinner.text = 'Generating configuration files...';
      await generateConfigFiles(configDir, config);
      
      spinner.text = 'Setting up directory structure...';
      await setupDirectoryStructure(configDir);
      
      if (config.environment === 'production') {
        spinner.text = 'Preparing production configuration...';
        await setupProductionConfig(configDir, config);
      }
      
      spinner.succeed(chalk.green('✅ SKS Rootz Platform initialized successfully!'));
      
      // Success message
      console.log(chalk.green.bold('\\n🎉 Installation Complete!'));
      console.log(chalk.cyan('\\n📍 Configuration Location:'));
      console.log(chalk.gray(`   ${configDir}`));
      
      console.log(chalk.cyan('\\n🚀 Next Steps:'));
      console.log(chalk.white('   1. Configure your settings:'));
      console.log(chalk.gray(`      cd ${configDir}`));
      console.log(chalk.gray('      nano config.ini'));
      
      console.log(chalk.white('\\n   2. Start the platform:'));
      console.log(chalk.yellow('      rootz-platform start'));
      
      console.log(chalk.white('\\n   3. Check status:'));
      console.log(chalk.yellow(`      curl http://${config.domain}:${config.port}/.rootz/status`));
      
      console.log(chalk.cyan('\\n📚 Documentation:'));
      console.log(chalk.gray('   https://github.com/rootz-global/sks-rootz-platform/blob/main/docs/'));
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Initialization failed'));
      console.error(chalk.red('Error:'), error.message);
      console.log(chalk.yellow('\\n💡 Try running with --quick-start for default setup'));
      process.exit(1);
    }
  });

// Start command
program
  .command('start')
  .description('Start the Rootz Platform service')
  .option('-d, --domain <domain>', 'Domain to start', 'localhost')
  .option('-p, --port <port>', 'Port number', '8000')
  .option('-c, --config <path>', 'Configuration directory path')
  .action(async (options) => {
    console.log(chalk.blue.bold('🚀 Starting SKS Rootz Platform'));
    console.log('='.repeat(40));
    
    const spinner = ora(chalk.blue('Initializing platform services...')).start();
    
    try {
      // Determine config path
      const configPath = options.config || path.join(os.homedir(), '.data-wallet', options.domain);
      
      if (!await fs.pathExists(configPath)) {
        spinner.fail(chalk.red('❌ Configuration not found'));
        console.log(chalk.yellow('\\n💡 Run "rootz-platform init" first to setup configuration'));
        process.exit(1);
      }
      
      spinner.text = 'Loading configuration...';
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      
      spinner.text = 'Starting platform services...';
      
      // Start the platform
      const { spawn } = require('child_process');
      const platformPath = path.join(__dirname, '..', 'dist', 'index.js');
      
      const env = {
        ...process.env,
        NODE_ENV: 'production',
        PORT: options.port,
        DOMAIN: options.domain,
        CONFIG_PATH: configPath
      };
      
      spinner.succeed(chalk.green('✅ Platform services started'));
      
      console.log(chalk.green.bold('\\n🌟 SKS Rootz Platform is running!'));
      console.log(chalk.cyan('\\n📡 Service Endpoints:'));
      console.log(chalk.white(`   • Status:     http://${options.domain}:${options.port}/.rootz/status`));
      console.log(chalk.white(`   • API:        http://${options.domain}:${options.port}/.rootz/api/`));
      console.log(chalk.white(`   • Email:      http://${options.domain}:${options.port}/.rootz/email-wallet/`));
      console.log(chalk.white(`   • Secrets:    http://${options.domain}:${options.port}/.rootz/secrets/`));
      
      console.log(chalk.cyan('\\n📊 Monitoring:'));
      console.log(chalk.gray('   • Logs:       rootz-platform logs'));
      console.log(chalk.gray('   • Status:     rootz-platform status'));
      console.log(chalk.gray('   • Stop:       Ctrl+C or rootz-platform stop'));
      
      const child = spawn('node', [platformPath], {
        env,
        stdio: 'inherit'
      });
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\\n\\n🛑 Shutting down SKS Rootz Platform...'));
        child.kill('SIGINT');
      });
      
      child.on('error', (error) => {
        console.error(chalk.red('❌ Platform error:'), error.message);
      });
      
      child.on('exit', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Platform stopped gracefully'));
        } else {
          console.log(chalk.red(`❌ Platform exited with code ${code}`));
        }
      });
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Failed to start platform'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check platform status')
  .option('-d, --domain <domain>', 'Domain to check', 'localhost')
  .option('-p, --port <port>', 'Port number', '8000')
  .action(async (options) => {
    const spinner = ora(chalk.blue('Checking platform status...')).start();
    
    try {
      const fetch = require('node-fetch');
      const response = await fetch(`http://${options.domain}:${options.port}/.rootz/status`, {
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const status = await response.json();
      
      spinner.succeed(chalk.green('✅ Platform is running'));
      
      console.log(chalk.green.bold('\\n🌟 SKS Rootz Platform Status'));
      console.log('='.repeat(40));
      console.log(chalk.cyan('Version:     ') + chalk.white(status.version || '1.0.0'));
      console.log(chalk.cyan('Environment: ') + chalk.white(status.environment || 'unknown'));
      console.log(chalk.cyan('Uptime:      ') + chalk.white(status.uptime || 'unknown'));
      console.log(chalk.cyan('Domain:      ') + chalk.white(`${options.domain}:${options.port}`));
      
      if (status.services) {
        console.log(chalk.cyan('\\nServices:'));
        status.services.forEach(service => {
          console.log(chalk.gray(`   • ${service}`));
        });
      }
      
      if (status.blockchain) {
        console.log(chalk.cyan('\\nBlockchain:'));
        console.log(chalk.gray(`   • Network: ${status.blockchain.network || 'unknown'}`));
        console.log(chalk.gray(`   • Balance: ${status.blockchain.balance || 'unknown'}`));
      }
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Platform is not responding'));
      console.log(chalk.yellow('\\n💡 Possible issues:'));
      console.log(chalk.gray('   • Platform not started (run: rootz-platform start)'));
      console.log(chalk.gray('   • Wrong domain/port specified'));
      console.log(chalk.gray('   • Network connectivity issues'));
      console.log(chalk.gray(`   • Error: ${error.message}`));
    }
  });

// Configuration command
program
  .command('config')
  .description('Manage platform configuration')
  .option('-d, --domain <domain>', 'Domain to configure', 'localhost')
  .option('-l, --list', 'List current configuration')
  .option('-e, --edit', 'Edit configuration file')
  .action(async (options) => {
    const configDir = path.join(os.homedir(), '.data-wallet', options.domain);
    const configFile = path.join(configDir, 'config.ini');
    
    if (options.list) {
      if (await fs.pathExists(configFile)) {
        const configContent = await fs.readFile(configFile, 'utf8');
        console.log(chalk.cyan('📝 Current Configuration:'));
        console.log(chalk.gray('=' .repeat(40)));
        console.log(configContent);
      } else {
        console.log(chalk.yellow('⚠️  No configuration found. Run "rootz-platform init" first.'));
      }
    } else if (options.edit) {
      if (await fs.pathExists(configFile)) {
        const { spawn } = require('child_process');
        const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'nano');
        spawn(editor, [configFile], { stdio: 'inherit' });
      } else {
        console.log(chalk.yellow('⚠️  No configuration found. Run "rootz-platform init" first.'));
      }
    } else {
      console.log(chalk.cyan('📁 Configuration location:'));
      console.log(chalk.gray(`   ${configDir}`));
      console.log(chalk.cyan('\\n📝 Available commands:'));
      console.log(chalk.gray('   --list    Show current configuration'));
      console.log(chalk.gray('   --edit    Edit configuration file'));
    }
  });

// Utility functions
async function generateConfigFiles(configDir, config) {
  const templateDir = path.join(__dirname, '..', 'templates');
  
  // Generate main config.ini
  const configTemplate = `[platform]
domain=${config.domain}
port=${config.port}
environment=${config.environment}

[email]
service=${config.emailService}
enabled=true

[blockchain]
network=${config.blockchain}
enabled=true

[services]
emailWallet=true
secretsManagement=false
aiWallet=false

[security]
enableHttps=${config.environment === 'production'}
corsEnabled=true

[logging]
level=info
file=platform.log
`;
  
  await fs.writeFile(path.join(configDir, 'config.ini'), configTemplate);
  
  // Generate service-specific configs based on choices
  if (config.emailService === 'graph') {
    await generateGraphConfig(configDir);
  }
  
  if (config.blockchain !== 'local') {
    await generateBlockchainConfig(configDir, config.blockchain);
  }
}

async function generateGraphConfig(configDir) {
  const graphTemplate = `[email.microsoftGraph]
enabled=true
tenantId=YOUR_TENANT_ID_HERE
clientId=YOUR_CLIENT_ID_HERE
clientSecret=YOUR_CLIENT_SECRET_HERE
userPrincipalName=process@yourdomain.com
pollIntervalMinutes=1
`;
  
  await fs.writeFile(path.join(configDir, 'email-graph.ini'), graphTemplate);
}

async function generateBlockchainConfig(configDir, network) {
  const blockchainTemplate = `[blockchain]
network=${network}
rpcUrl=${network === 'amoy' ? 'https://rpc-amoy.polygon.technology/' : 'https://polygon-rpc.com/'}
serviceWalletPrivateKey=YOUR_PRIVATE_KEY_HERE
contractRegistration=0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F
contractEmailDataWallet=0x52eBB3761D36496c29FB6A3D5354C449928A4048
contractAuthorization=0xcC2a65A8870289B1d33bA741069cC2CEEA219573
`;
  
  await fs.writeFile(path.join(configDir, 'blockchain.ini'), blockchainTemplate);
}

async function setupDirectoryStructure(configDir) {
  // Create subdirectories
  await fs.ensureDir(path.join(configDir, 'logs'));
  await fs.ensureDir(path.join(configDir, 'data'));
  await fs.ensureDir(path.join(configDir, 'backups'));
  
  // Create a README for the user
  const readmeContent = `# SKS Rootz Platform Configuration

This directory contains your platform configuration files following the EPISTERY pattern.

## Configuration Files:
- config.ini: Main platform configuration
- email-graph.ini: Microsoft Graph API settings (if applicable)
- blockchain.ini: Blockchain network configuration

## Important Security Notes:
- Never commit these files to version control
- Keep your private keys and API credentials secure
- Regular backup your configuration

## Getting Help:
- Documentation: https://github.com/rootz-global/sks-rootz-platform/blob/main/docs/
- Issues: https://github.com/rootz-global/sks-rootz-platform/issues
`;
  
  await fs.writeFile(path.join(configDir, 'README.md'), readmeContent);
}

async function setupProductionConfig(configDir, config) {
  // Generate additional production files
  const nginxTemplate = `# Nginx configuration for ${config.domain}
server {
    listen 80;
    server_name ${config.domain};
    
    location /.rootz/ {
        proxy_pass http://localhost:${config.port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        root /var/www/html;
        try_files $uri $uri/ =404;
    }
}
`;
  
  await fs.writeFile(path.join(configDir, 'nginx.conf'), nginxTemplate);
}

program.parse();
