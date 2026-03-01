# NW Empire — PocketBase MVP

Self-hosted directory MVP built with:
- **Next.js 16** (App Router, ISR, standalone output)
- **PocketBase** (self-hosted SQLite backend, single binary)
- **nw-empire CLI** (Commander.js — launch, setup, seed, test)

## Quick Start

```bash
# 1. Install PocketBase
bash scripts/setup-pocketbase.sh

# 2. Install frontend & CLI
cd frontend && npm install && cd ..
cd cli && npm install && npm link && cd ..

# 3. Launch
nw-empire dev          # starts PocketBase + Next.js dev

# 4. Setup database (first time)
nw-empire setup-db

# 5. Seed sample listings
nw-empire seed --count 10

# 6. Verify everything works
nw-empire test
```

## Deploy to VPS

```bash
bash scripts/deploy-mvp.sh
```

## Project Structure

```
nw-empire/
├── frontend/          # Next.js 16 App Router
│   ├── app/           # Pages: /, /[city], /[city]/[slug], /api/leads
│   ├── components/    # LeadCaptureForm, VendorCard, SearchBar
│   └── lib/           # pocketbase.ts, directory-config.ts
├── cli/               # nw-empire CLI (Commander.js)
│   ├── bin/           # nw-empire.js
│   └── commands/      # setup-collections.js
├── scripts/           # setup-pocketbase.sh, deploy-mvp.sh, test-e2e.sh
├── configs/           # nginx.conf, .env.example
└── backend/
    └── pocketbase/    # PocketBase binary lives here (gitignored)
```

## E2E Verification

The `test-e2e.sh` script checks:
1. PocketBase health + collections
2. Next.js homepage + lead API
3. Lead form submission + PocketBase save + cleanup
4. City SEO page route (/seattle)
5. CLI installed and executable
6. TypeScript no errors
