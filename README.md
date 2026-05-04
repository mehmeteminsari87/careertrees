# CareerTrees

Multi-country job aggregator. Subdomain per country (`ie.careertrees.org`, `nl.`, `pt.`, `it.`, `de.`).
Data pulled directly from public ATS APIs (Greenhouse, Lever, Workday, etc.). No scraping of LinkedIn/Indeed.

## Stack

- **Next.js 15** (App Router, RSC) — SSG/ISR, Tailwind 4
- **Supabase Postgres** — single DB, country-partitioned by `country_code`
- **Cloudflare Pages** — hosting + edge cache
- **GitHub Actions** — scheduled scrape (3x daily)
- **TypeScript everywhere**

## First-time setup checklist

Do these in order. Each step has a clear "you do" / "Claude does" split.

### 1. Cloudflare DNS (you)

1. Sign up at https://dash.cloudflare.com/sign-up
2. Add `careertrees.org` as a site, pick the **Free** plan
3. Cloudflare scans your existing DNS — leave it as-is, Continue
4. Cloudflare gives you 2 nameservers — copy them
5. Go to Squarespace → Domains → careertrees.org → DNS → Custom Nameservers, paste the 2 NS, Save
6. Wait 1–24h for propagation; Cloudflare emails when active
7. In Cloudflare DNS, add a CNAME `ie` → `<pages-project>.pages.dev` (after step 4 below)

### 2. Supabase (you, then paste credentials)

1. Sign up at https://supabase.com
2. Create new project → pick region **eu-west-1** (Dublin) for low latency to Ireland users
3. Save the database password somewhere safe
4. Go to **Project Settings → Database → Connection string → URI** — copy the **Transaction pooler** string and the **Direct** string
5. Paste both into `.env` at the project root:

   ```bash
   cp .env.example .env
   # Edit .env with your Supabase URLs and keys
   ```

6. Apply the schema:

   ```bash
   npm install
   npm run db:init
   ```

   This runs `db/schema.sql` against your database. It's idempotent — safe to re-run.

### 3. GitHub repo (you)

1. Create a new public repo `careertrees` on GitHub (public = unlimited Actions minutes)
2. From this directory:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/careertrees.git
   git push -u origin main
   ```

3. In repo Settings → Secrets and variables → Actions, add:
   - `DATABASE_URL` — same value as in `.env`
   - `ANTHROPIC_API_KEY` — for AI tag extraction (optional for MVP)
   - `INDEXNOW_KEY` — generate at https://www.bing.com/indexnow (optional)

### 4. Cloudflare Pages (you)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Authorize and pick `careertrees` repo
3. Build settings:
   - Framework preset: **Next.js**
   - Build command: `npm run build`
   - Build output: `.next`
   - Node version: `22`
4. Environment variables (in Pages project settings):
   - `DATABASE_URL` — Supabase Transaction pooler string
   - `NEXT_PUBLIC_SITE_URL` — `https://careertrees.org`
   - `NEXT_PUBLIC_DEFAULT_COUNTRY` — `ie`
5. Deploy. After first deploy, in **Custom domains** add `ie.careertrees.org`. Cloudflare will auto-issue SSL.

### 5. Verify subdomain DNS (you)

Back in Cloudflare DNS → add CNAME:
- Name: `ie`
- Target: `<your-pages-project>.pages.dev`
- Proxy status: Proxied (orange cloud)

`ie.careertrees.org` should serve the home page within 1–5 minutes.

## Local development

```bash
npm install
cp .env.example .env       # add your DATABASE_URL
npm run db:init            # one-time
npm run scrape             # populate jobs (pulls from Greenhouse/Lever/Workday)
npm run dev                # http://localhost:3000
```

## Project structure

```
app/                       Next.js App Router pages
  (root)/page.tsx          Country home
  jobs/                    Job listing pages
    [role]/page.tsx        Role hub (e.g. /jobs/software-engineer)
    [role]/in/[city]/      Role × city (e.g. /jobs/software-engineer/in/dublin)
  job/[id]/[slug]/         Individual job
  companies/[slug]/        Company profile
  sitemap.xml/route.ts     Dynamic sitemap
  robots.txt/route.ts      Dynamic robots
  llms.txt/route.ts        AI crawler index
components/                Shared React components
lib/                       DB client, schema-org helpers, country config
db/schema.sql              Postgres schema (apply via `npm run db:init`)
scripts/scrapers/          ATS scrapers (Greenhouse, Lever, Workday)
  targets.ts               Company list — edit to add new companies
  run-all.ts               Entrypoint used by GitHub Actions
.github/workflows/         CI workflows (scrape cron)
```

## Adding a new company

1. Find the company's careers page
2. Identify the ATS (URL pattern reveals it):
   - `boards.greenhouse.io/{token}` → Greenhouse
   - `jobs.lever.co/{token}` → Lever
   - `{tenant}.{region}.myworkdayjobs.com` → Workday
   - `jobs.smartrecruiters.com/{token}` → SmartRecruiters
   - `jobs.ashbyhq.com/{token}` → Ashby
3. Add an entry to `scripts/scrapers/targets.ts`
4. Run `npm run scrape:greenhouse` (or whichever ATS) to verify it pulls jobs
5. Commit & push

## Adding a new country

1. Add the country code to `db/schema.sql` (countries table seed) and `lib/countries.ts`
2. Set `status: "live"` once ready
3. Add CNAME `<code>` → pages.dev in Cloudflare DNS
4. Add `<code>.careertrees.org` as custom domain in Cloudflare Pages
5. Seed major cities for the country in `db/schema.sql`
6. Add 30+ companies for that country to `scripts/scrapers/targets.ts`

## Content rules (non-negotiable)

- **Zero AI-generated prose in user-facing content.** AI is used only for structured extraction (tech stack tags, role classification) — never for blog posts, company descriptions, or job summaries.
- **Cornerstone guides are human-written**, period. AI may help with research/outline, but the final text is rewritten by hand.
- **Every page must serve a real user need.** Pages with <3 jobs auto-`noindex` to avoid thin-content penalties.

## SEO/AEO checklist (verify on every release)

- [ ] All job pages have valid `JobPosting` JSON-LD (test: https://search.google.com/test/rich-results)
- [ ] `validThrough` is set on every job; expired jobs flip to `eventStatus: JobPostingClosed`
- [ ] `directApply: false` everywhere (we redirect to company site)
- [ ] Sitemap returns valid XML at `/sitemap.xml`
- [ ] `robots.txt` allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended
- [ ] `llms.txt` exists at root
- [ ] Lighthouse score (mobile) ≥ 95 on all template types
- [ ] INP (p75) ≤ 200ms, LCP ≤ 2.5s, CLS ≤ 0.1
