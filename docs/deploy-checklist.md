# Production Checklist

## Pre-Deploy
- [ ] `.env.local` values tested locally
- [ ] `npm run verify` passes
- [ ] E2E intentionally skipped for initial release
- [ ] Database schema pushed and seed verified

## Vercel Project Settings
- [ ] Framework preset: Next.js
- [ ] Build command: `npm run build`
- [ ] Install command: `npm install`
- [ ] Root directory: `projects/04-nextjs-fullstack-dashboard/saas-analytics-copilot`

## Env Vars
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `GITHUB_CLIENT_ID`
- [ ] `GITHUB_CLIENT_SECRET`
- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_MODEL`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `GITHUB_TOKEN`
- [ ] `CRON_SECRET`

## Cron Notes
- [ ] `vercel.json` schedule matches your Vercel plan limits
- [ ] Default Hobby-safe schedule set to daily (`0 9 * * *`, UTC)
- [ ] Vercel project has `CRON_SECRET` set
- [ ] Worker route uses `GET /api/jobs` with `Authorization: Bearer <CRON_SECRET>`

## Post-Deploy Verification
- [ ] `GET /api/health` returns 200
- [ ] Dashboard loads with demo credentials
- [ ] AI Copilot streams responses
- [ ] Stripe webhook endpoint reachable
- [ ] Vercel Cron triggers `/api/jobs`
- [ ] Logs visible for API calls and errors
- [ ] Optional after ship: `npm run test:e2e`
