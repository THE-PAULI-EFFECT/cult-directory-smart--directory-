# 🚀 NW Directory Empire — Complete Deployment Checklist

## Phase 1 Status: ✅ COMPLETE

Core infrastructure is ready. Use this checklist to deploy Phase 1 (infrastructure) and then move to Phase 2 (pages).

---

## PART 1: Pre-Deployment Setup (30 minutes)

### Supabase

- [ ] Create Supabase project at https://supabase.com/dashboard
- [ ] Save project URL, anon key, and service role key
- [ ] Run database migrations (copy SQL from `supabase/migrations/20250218_core_schema.sql`)
- [ ] Verify tables exist: `listings`, `leads`, `vendors`, `enrichment_jobs`, `analytics_events`
- [ ] Test RLS policies work (try querying as anon user)

### Resend Email

- [ ] Sign up at https://resend.com
- [ ] Create API key
- [ ] Verify domain (or use default `resend.dev` for testing)
- [ ] Note API key for `.env.local`

### Anthropic API

- [ ] Sign up at https://console.anthropic.com
- [ ] Create API key
- [ ] Add credits for data enrichment
- [ ] Note key for `.env.local`

### Google Analytics (Optional but Recommended)

- [ ] Create GA4 property at https://analytics.google.com
- [ ] Get measurement ID (format: `G-XXXXXXXXXX`)
- [ ] Add to `.env.local`

### Environment Setup

- [ ] Copy `.env.local.example` → `.env.local`
- [ ] Fill in all required values (see below)
- [ ] **NEVER commit `.env.local` to git**
- [ ] Verify `.env.local` is in `.gitignore` ✓

**.env.local Required Values:**

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
SUPABASE_PROJECT_ID=xxxx

ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...

NEXT_PUBLIC_NICHE=porta_potty
NEXT_PUBLIC_SITE_NAME="WA Porta Potty Directory"
NEXT_PUBLIC_SITE_DOMAIN="wa-portapotty.com"
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## PART 2: Local Testing (30 minutes)

### Install & Build

```bash
pnpm install
pnpm run build
```

- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings (or only ignorable)

### Run Dev Server

```bash
pnpm run dev
```

- [ ] Server starts on http://localhost:3000
- [ ] No console errors

### Test Lead Form

1. Go to http://localhost:3000
2. Scroll down to Lead Capture Form (or any page with it)
3. Fill out form:
   ```
   Name: Test User
   Phone: (206) 555-0100
   Email: your-test-email@gmail.com
   Event Type: Wedding
   Event Location: Seattle, WA
   Units: 1
   Duration: 2
   ```
4. Click "Get Free Quotes Now"

**Expected Result:**
- [ ] Form shows success message ✅
- [ ] Supabase shows new row in `leads` table
- [ ] Check email inbox for Resend email (might go to spam)

### Test Supabase Connection

```bash
# In browser console (F12):
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('YOUR_URL', 'YOUR_KEY');
const { data } = await supabase.from('leads').select().limit(1);
console.log(data);
```

- [ ] Returns data without errors

### Test Analytics Tracking

```bash
# In browser console:
fetch('/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'test_event',
    properties: { test: true }
  })
}).then(r => r.json()).then(console.log);
```

- [ ] Returns `{ success: true }`
- [ ] Check Supabase `analytics_events` table for new row

---

## PART 3: Supabase Edge Function Deployment (15 minutes)

### Install Supabase CLI

```bash
npm install -g supabase
```

### Deploy notify-vendor Function

```bash
supabase link --project-id your-project-id
supabase functions deploy notify-vendor
```

- [ ] Function deploys successfully
- [ ] No errors in deploy output

### Add Secrets

```bash
supabase secrets set RESEND_API_KEY="re_your_key" --project-id your-project-id
```

### Test Edge Function

```bash
# Get a listing ID from database, then:
curl -X POST \
  https://your-project.supabase.co/functions/v1/notify-vendor \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"listing_id": "your-listing-uuid"}'
```

- [ ] Returns `{ success: true }`
- [ ] Check Resend logs for sent email
- [ ] Vendor email received (check spam folder)

---

## PART 4: Vercel Deployment (20 minutes)

### Push to GitHub

```bash
git add .
git commit -m "Phase 1 complete: Infrastructure ready"
git push -u origin claude/setup-project-ajm7l
```

- [ ] Code pushed to branch
- [ ] All 7 commits visible in git log

### Create Vercel Project

1. Go to https://vercel.com/new
2. Import GitHub repository
3. Select `nw-portapotty-directory` repo
4. Click "Import"

### Add Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL        = https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJhb...
SUPABASE_SERVICE_ROLE_KEY       = eyJhb...
SUPABASE_PROJECT_ID             = xxxx
ANTHROPIC_API_KEY               = sk-ant-...
RESEND_API_KEY                  = re_...
NEXT_PUBLIC_NICHE               = porta_potty
NEXT_PUBLIC_SITE_NAME           = WA Porta Potty Directory
NEXT_PUBLIC_SITE_DOMAIN         = wa-portapotty.com
NEXT_PUBLIC_GA_ID               = G-XXXXXXXXXX
```

- [ ] All variables added
- [ ] No typos in keys

### Deploy

Click "Deploy" button

- [ ] Build succeeds (check build logs)
- [ ] Deployment completes
- [ ] Production URL provided

### Test Production

Visit the Vercel URL:

```
https://nw-portapotty-directory.vercel.app
```

- [ ] Page loads
- [ ] Lead form works
- [ ] Success message appears after submit
- [ ] Check Supabase for new lead row

---

## PART 5: Custom Domain Setup (10 minutes)

### Add Domain to Vercel

1. In Vercel Project → Settings → Domains
2. Click "Add"
3. Enter: `wa-portapotty.com`
4. Verify domain ownership (follow Vercel instructions)
5. Update DNS records with Vercel-provided values

**Timing:** DNS propagation takes 24-48 hours

- [ ] Domain added to Vercel
- [ ] DNS records updated
- [ ] Site accessible at `https://wa-portapotty.com` (after DNS propagates)

### Verify HTTPS

```bash
curl -I https://wa-portapotty.com
```

- [ ] Returns `200 OK`
- [ ] HTTPS is working
- [ ] No certificate warnings

---

## PART 6: Search Engine Indexing (Immediate)

### Submit Sitemap to Google

1. Go to https://search.google.com/search-console
2. Add property: `https://wa-portapotty.com`
3. Verify domain ownership (add DNS record or upload HTML file)
4. Go to "Sitemaps"
5. Submit: `https://wa-portapotty.com/sitemap.xml`

- [ ] Sitemap submitted
- [ ] No errors in sitemap

### Check Indexation

```bash
# In Google Search Console, check:
# - Indexation status
# - Top queries
# - Coverage (any errors?)
```

- [ ] No indexation errors
- [ ] Sitemap processed

### Submit to Bing

1. Go to https://www.bing.com/webmasters
2. Add `wa-portapotty.com`
3. Submit sitemap
4. Verify domain

- [ ] Bing submission complete

---

## PART 7: Monitoring & QA (Ongoing)

### Logs

- [ ] Check Supabase Edge Function logs
  ```bash
  supabase functions get-logs notify-vendor
  ```
- [ ] Check Vercel function logs
  ```
  Vercel Dashboard > Functions > Logs
  ```

### Metrics to Watch

- [ ] **Leads captured:** Check Supabase `leads` table count
- [ ] **Lead routing success:** Check `routed_to_vendor = true` count
- [ ] **Vendor emails sent:** Check Resend dashboard
- [ ] **Page load time:** Monitor Vercel Analytics
- [ ] **Search Console:** Check crawl status, indexation

### Set Alerts

- [ ] Vercel deployment failures
- [ ] Edge Function errors
- [ ] Resend email delivery failures

---

## ✅ Phase 1 Deployment Complete

When all checkboxes above are checked:

- ✅ Infrastructure deployed and tested
- ✅ Lead capture flow working end-to-end
- ✅ Vendor notifications sending via email
- ✅ Site indexed by Google
- ✅ Ready for Phase 2

---

## 📋 Phase 2 Ready: Next Priority

Once Phase 1 is live, immediately start Phase 2:

**City Page Generator** (`app/[city]/page.tsx`)

Why? Because 90% of organic traffic comes from city pages. Get these live ASAP to start capturing search traffic.

See: [CITY_PAGES_SPEC.md](./CITY_PAGES_SPEC.md) (to be created)

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails on Vercel | Check env vars in Vercel dashboard; check console errors locally |
| Lead form returns error | Check browser console; check Supabase dashboard for connection issues |
| Vendor email not sending | Check Resend API key; check spam folder; check Edge Function logs |
| Domain not resolving | Wait 24-48 hours for DNS; verify DNS records in Vercel |
| Page too slow | Check Supabase query performance; enable caching on Vercel |
| RLS policy rejection | Check that user has appropriate auth; check policy logic in SQL |

---

## 📊 Success Metrics (7 days post-launch)

Target these within first week:

- [ ] 100+ leads captured
- [ ] 50+ unique visitors
- [ ] 0 error rate on lead submission
- [ ] Average email delivery time < 2 minutes
- [ ] 2-3 leads routed to vendors
- [ ] Site in Google top 100 for "porta potty rental seattle"

If not hitting targets, check:
1. Are vendors actually claiming listings?
2. Is SEO content optimized? (need Phase 2)
3. Is lead form visible on all pages?

---

**Deployment Date:** ___________

**Live URL:** https://wa-portapotty.com

**Deployed By:** ___________

**Notes:**

