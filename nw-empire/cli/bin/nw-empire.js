#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { exec, spawn } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');

const execPromise = util.promisify(exec);
const ROOT = path.resolve(__dirname, '../..');

const program = new Command();

program
  .name('nw-empire')
  .description('NW Directory Empire — Autonomous Business Builder CLI')
  .version('1.0.0');

// ── LAUNCH ───────────────────────────────────────────────────────────────────
program
  .command('launch')
  .description('Launch the full directory MVP (frontend + PocketBase)')
  .option('-n, --niche <niche>', 'Directory niche', 'porta_potty')
  .option('--skip-build', 'Skip Next.js build (use for dev)')
  .action(async (options) => {
    console.log(chalk.bold.green('\n🚀 LAUNCHING NW DIRECTORY EMPIRE\n'));

    const steps = [];

    if (!options.skipBuild) {
      steps.push(
        { name: 'Installing frontend dependencies', cmd: `cd ${ROOT}/frontend && npm install` },
        { name: 'Building Next.js app', cmd: `cd ${ROOT}/frontend && npm run build` }
      );
    }

    steps.push(
      { name: 'Starting PocketBase', cmd: `systemctl start pocketbase 2>/dev/null || (cd ${ROOT}/backend/pocketbase && ./pocketbase serve --http="0.0.0.0:8090" &)` },
      { name: 'Starting Next.js (pm2)', cmd: `pm2 start npm --name nw-portapotty -f -- start --prefix ${ROOT}/frontend || (cd ${ROOT}/frontend && npm start &)` }
    );

    for (const step of steps) {
      const spinner = ora(step.name).start();
      try {
        await execPromise(step.cmd, { timeout: 180000 });
        spinner.succeed(chalk.green(step.name));
      } catch (err) {
        spinner.fail(chalk.red(`${step.name} — ${err.message.split('\n')[0]}`));
      }
    }

    console.log(chalk.bold.green('\n✅ LAUNCH COMPLETE!'));
    console.log(chalk.cyan('  🌐 Frontend: http://localhost:3000'));
    console.log(chalk.cyan('  🗄️  PocketBase: http://localhost:8090/_/'));
    console.log(chalk.yellow('\n  💡 First time? Run: nw-empire setup-db'));
  });

// ── DEV ──────────────────────────────────────────────────────────────────────
program
  .command('dev')
  .description('Start development servers (frontend + PocketBase)')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔧 Starting dev environment...\n'));

    // Start PocketBase in background
    const pb = spawn(`${ROOT}/backend/pocketbase/pocketbase`, ['serve', '--http=0.0.0.0:8090'], {
      detached: true,
      stdio: 'ignore',
      cwd: `${ROOT}/backend/pocketbase`,
    });
    pb.unref();
    console.log(chalk.green('  ✓ PocketBase started on :8090'));

    // Start Next.js dev
    console.log(chalk.green('  ✓ Starting Next.js dev on :3000\n'));
    const next = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      cwd: `${ROOT}/frontend`,
    });

    next.on('close', (code) => process.exit(code || 0));
  });

// ── STATUS ───────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Check system status')
  .action(async () => {
    console.log(chalk.bold('\n📊 NW EMPIRE — SYSTEM STATUS\n'));

    const checks = [
      { name: 'PocketBase     :8090', cmd: 'curl -sf http://localhost:8090/api/health' },
      { name: 'Next.js        :3000', cmd: 'curl -sf http://localhost:3000' },
      { name: 'Lead API       /api/leads', cmd: 'curl -sf http://localhost:3000/api/leads' },
    ];

    for (const { name, cmd } of checks) {
      try {
        await execPromise(cmd, { timeout: 5000 });
        console.log(chalk.green(`  ✓ ${name}`));
      } catch {
        console.log(chalk.red(`  ✗ ${name}`));
      }
    }

    // Disk
    try {
      const { stdout } = await execPromise('du -sh /opt/nw-empire 2>/dev/null || du -sh .');
      console.log(chalk.gray(`\n  💾 Project size: ${stdout.split('\t')[0]}`));
    } catch {}

    console.log('');
  });

// ── SCRAPE ───────────────────────────────────────────────────────────────────
program
  .command('scrape')
  .description('Scrape vendor listings for a city')
  .option('-c, --city <city>', 'City to scrape', 'Seattle')
  .option('-n, --niche <niche>', 'Niche', 'porta_potty')
  .action(async (options) => {
    const spinner = ora(`Scraping ${options.niche} vendors in ${options.city}, WA...`).start();

    try {
      const scriptPath = `${ROOT}/scripts/scrape-vendors.sh`;
      const { stdout, stderr } = await execPromise(
        `bash ${scriptPath} "${options.city}" "${options.niche}"`,
        { timeout: 120000 }
      );
      spinner.succeed(`Scrape complete for ${options.city}`);
      if (stdout) console.log(chalk.gray(stdout));
    } catch (err) {
      spinner.fail(`Scrape failed: ${err.message.split('\n')[0]}`);
      console.log(chalk.yellow('\n  Run the data pipeline manually:'));
      console.log(chalk.gray(`  python3 ${ROOT}/scripts/pipeline/01_scrape_outscraper.py --niche ${options.niche}`));
    }
  });

// ── SETUP-DB ─────────────────────────────────────────────────────────────────
program
  .command('setup-db')
  .description('Initialize PocketBase collections (run once after first launch)')
  .option('--admin-email <email>', 'PocketBase admin email', 'admin@nw-empire.local')
  .option('--admin-password <password>', 'PocketBase admin password', 'Adm1n!Empire2025')
  .action(async (options) => {
    console.log(chalk.bold('\n🗄️  Setting up PocketBase collections...\n'));

    // Authenticate
    const spinner = ora('Authenticating with PocketBase...').start();
    let token = '';

    try {
      const { default: axios } = await import('axios');
      const authRes = await axios.post('http://localhost:8090/api/admins/auth-with-password', {
        identity: options.adminEmail,
        password: options.adminPassword,
      });
      token = authRes.data.token;
      spinner.succeed('Authenticated');
    } catch {
      spinner.fail('Authentication failed — ensure PocketBase is running and admin user exists');
      console.log(chalk.yellow(`\n  1. Visit http://localhost:8090/_/ to create admin`));
      console.log(chalk.yellow(`  2. Then re-run: nw-empire setup-db --admin-email=... --admin-password=...`));
      return;
    }

    const collections = require('../commands/setup-collections')(token);
    for (const col of collections) {
      const s = ora(`Creating collection: ${col.name}`).start();
      try {
        const { default: axios } = await import('axios');
        await axios.post('http://localhost:8090/api/collections', col.schema, {
          headers: { Authorization: token },
        });
        s.succeed(`Collection created: ${col.name}`);
      } catch (err) {
        s.warn(`${col.name} — ${err.response?.data?.message || 'may already exist'}`);
      }
    }

    console.log(chalk.bold.green('\n✅ Database setup complete!'));
  });

// ── SEED ─────────────────────────────────────────────────────────────────────
program
  .command('seed')
  .description('Seed sample listings for testing')
  .option('-n, --count <count>', 'Number of sample listings', '5')
  .action(async (options) => {
    const { default: axios } = await import('axios');
    const count = parseInt(options.count);
    const cities = ['Seattle', 'Tacoma', 'Spokane', 'Bellevue', 'Everett'];
    const spinner = ora(`Seeding ${count} sample listings...`).start();

    for (let i = 0; i < count; i++) {
      const city = cities[i % cities.length];
      const name = `${city} Portable Sanitation Co ${i + 1}`;
      const slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

      try {
        await axios.post('http://localhost:8090/api/collections/listings/records', {
          business_name: name,
          slug,
          city,
          state: 'Washington',
          phone: `(206) 555-${String(1000 + i).padStart(4, '0')}`,
          niche: 'porta_potty',
          google_rating: (3.5 + Math.random() * 1.5).toFixed(1),
          google_review_count: Math.floor(10 + Math.random() * 200),
          is_featured: i === 0,
          is_luxury: i % 3 === 0,
          is_verified: true,
          status: 'active',
          amenities: ['running_water', 'ada_compliant', 'same_day_delivery'].slice(0, 2),
          service_areas: [city],
          description: `${name} provides reliable portable sanitation solutions throughout ${city} and surrounding Washington areas.`,
        });
      } catch (err) {
        spinner.fail(`Failed at listing ${i + 1}: ${err.response?.data?.message || err.message}`);
        return;
      }
    }

    spinner.succeed(`Seeded ${count} sample listings`);
    console.log(chalk.green(`\n  Visit http://localhost:3000 to see the listings!`));
  });

// ── TEST ─────────────────────────────────────────────────────────────────────
program
  .command('test')
  .description('Run end-to-end health checks')
  .action(async () => {
    const scriptPath = path.resolve(__dirname, '../../scripts/test-e2e.sh');
    const child = spawn('bash', [scriptPath], { stdio: 'inherit' });
    child.on('close', (code) => {
      process.exit(code || 0);
    });
  });

program.parse(process.argv);
