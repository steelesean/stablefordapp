# Deer Park Stableford

Self-service Stableford scoring for a one-day competition at **Deer Park Golf & Country Club**, Livingston. Each player opens a shared link on their phone, enters their name, handicap, tee and prediction of the winner, and then scores hole-by-hole. The organizer opens an admin URL to see live standings and the predictions tally.

## What's built in

- Hard-coded Deer Park card (par + stroke index for White / Yellow / Black / Red tees). See `lib/course.ts`.
- Pure stableford scoring with unit tests. See `lib/stableford.ts` / `tests/stableford.test.ts` — 26 tests.
- Next.js 16 App Router, TypeScript, Tailwind v4.
- Upstash Redis for persistence (with in-memory fallback for local dev).
- Admin URL protected by a shared secret in the query string, constant-time compared to `ADMIN_KEY`.
- Auto-save after every hole, local cache of pending scores so a lost signal doesn't lose data, resume-on-reopen.
- Countback tiebreak (back 9 → back 6 → back 3 → last hole), server-side recomputation of totals.
- Copy-as-text for both the results table and the predictions table (paste into WhatsApp).

## Local development

```bash
# in ~/projects/stableford-app
ADMIN_KEY=dev-secret npm run dev
```

Open http://localhost:3000. No Upstash required — an in-memory store kicks in when `KV_REST_API_URL` is not set. The data evaporates when the dev server stops, which is what you want for testing.

Admin URL: http://localhost:3000/admin?key=dev-secret

### Run the scoring tests

```bash
npm test
```

All 26 tests must pass before a deploy.

## Deploying to Vercel

1. **Push to GitHub** (or use the Vercel CLI with `vercel link`).
2. **Import the project** at https://vercel.com/new — framework is auto-detected.
3. **Add Upstash Redis** via Vercel Dashboard → Storage → Browse Marketplace → Upstash (Serverless Redis). Link it to the project. This injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
4. **Set `ADMIN_KEY`** in Project → Settings → Environment Variables. Use a long random string. You can generate one with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
5. **Redeploy** so the env vars take effect. The production URL (e.g. `https://stableford-app.vercel.app`) is what you share with players.
6. **Bookmark the admin URL**: `https://<your-domain>/admin?key=<ADMIN_KEY>`

## Player flow

1. `/` — landing. Tap "Enter your scores" (or "Resume round" if returning).
2. `/setup` — name, handicap, tee, prediction. "Start round".
3. `/play` — one hole at a time. – / + stepper, quick-tap par-relative buttons, auto-save. "Next hole" until hole 18, then "Review".
4. `/review` — 18-hole summary, per-hole points, total. "Submit final" with a confirmation modal.
5. `/done` — thank-you + total. UI locked from here; edits go through the admin.

## Organizer flow

`/admin?key=<ADMIN_KEY>`:

- **Round open / closed** toggle. "Close round" locks joining and flips live standings into a final results table.
- **Live standings**: name, handicap, holes played, total points, last update time, submitted flag.
- **Delete player** (×) — use for duplicates or test entries.
- **Predicted winner votes** — aggregated, case-insensitive, sorted by vote count.
- **Copy as text** — dumps either table as plain text ready to paste.
- **Auto-refresh** every 10 s.

## Pre-weekend verification checklist

- [ ] `npm test` — 26 tests green.
- [ ] Local smoke test: create two test players via the UI, score a few holes, open admin page with the dev key, confirm totals match hand calculations.
- [ ] Deploy to Vercel with Upstash + `ADMIN_KEY` set.
- [ ] On your phone (production URL): full 18-hole dummy round as "Test Alice". Submit.
- [ ] In an incognito tab (production URL): partial round as "Test Bob", close the tab, reopen — confirm resume works.
- [ ] Admin URL on desktop: both players visible, totals sensible, predictions table populated.
- [ ] Delete both test players from admin before the real round.
- [ ] Test airplane-mode recovery: turn wifi off, enter a hole, turn wifi on, confirm the score lands on the server.
- [ ] Double-check the `ADMIN_KEY` is NOT accidentally in the public URL you share with players.

## File structure

```
app/
  page.tsx              landing
  setup/page.tsx        name / handicap / tee / prediction
  play/page.tsx         hole-by-hole scoring (single client page)
  review/page.tsx       18-hole summary + final submit
  done/page.tsx         locked thank-you screen
  admin/page.tsx        server component, validates key
  admin/AdminDashboard.tsx  client dashboard
  api/player/route.ts           POST create
  api/player/[id]/route.ts      GET/PATCH per player
  api/admin/route.ts            GET all, POST admin actions
lib/
  stableford.ts         pure scoring (tested)
  course.ts             Deer Park card (source of truth)
  redis.ts              Upstash client with memory fallback
  store.ts              CRUD on top of redis
  auth.ts               constant-time ADMIN_KEY check
  types.ts              Player, RoundConfig
  client-storage.ts     localStorage helpers for resume + offline cache
tests/
  stableford.test.ts    26 unit tests
```

## Uninstalling the Node install (if you want)

This project was built using a Node LTS tarball unpacked at `~/.local/node` (to avoid needing sudo for Homebrew). To remove it entirely:

```bash
rm -rf ~/.local/node
```

If you ever want `node` / `npm` on your regular PATH, add to `~/.zshrc`:

```sh
export PATH="$HOME/.local/node/bin:$PATH"
```
