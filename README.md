# My Day — Personal Task Tracker

A private, mobile-responsive daily task tracker built with **SvelteKit 5, TypeScript, Supabase, Chart.js, and Cloudflare Workers**. One authorized user can create and complete tasks, view daily/monthly progress charts, and retain historical completion percentages after old task rows are archived.

## Features

- Private email/password login through Supabase Auth; server checks the authorized owner's email
- Responsive desktop and mobile dashboard with mobile bottom navigation
- Add, edit, complete, filter, and delete daily tasks; assign priorities and dates
- Today's task counts and completion percentage
- Daily progress chart (weekly navigation) and monthly chart (yearly navigation)
- Green dashed **60% target** line
- Permanent daily progress summaries saved in PostgreSQL
- Optional automated cleanup of past tasks, **disabled until you enable Supabase Cron**

## Tech stack

| Layer | Technology |
|---|---|
| Frontend and server | SvelteKit 5 + TypeScript |
| Database and authentication | Supabase PostgreSQL + Supabase Auth |
| Charting | Chart.js |
| Icons | lucide-svelte |
| Hosting | Cloudflare Workers |

## 1. Requirements

- Node.js compatible with the project's SvelteKit/Vite versions (Node.js 22 LTS or newer is recommended)
- npm, VS Code, and a Supabase account
- Cloudflare account to host online; no custom domain required

## 2. Run locally on Windows (D: drive)

Extract the project to `D:\my-day-task-tracker` (or adjust commands to your actual folder). Open **Command Prompt**:

```cmd
cd /d D:\my-day-task-tracker
npm install
copy .env.example .env
```

Open `.env` and enter your own values:

```env
PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
PRIVATE_OWNER_EMAIL=your-email@example.com
```

Get the project URL and publishable API key from your **Supabase project dashboard**. `PRIVATE_OWNER_EMAIL` must match the email of your Supabase Auth user. Never put a Supabase **secret** or **service-role** key into a `PUBLIC_` variable.

Run:

```cmd
npm run check
npm run dev
```

Open `http://localhost:5173` in your browser. Stop the local server with `Ctrl+C`.

### Test on a phone over local Wi-Fi

Connect phone and laptop to the same trusted Wi-Fi. `npm run dev` is configured to listen on the local network. Run `ipconfig`, find the laptop's **IPv4 Address**, then browse to `http://YOUR_LAPTOP_IP:5173` on the phone. Allow only private-network firewall access; don't expose the development server to the internet.

## 3. Set up Supabase

1. Create a project at https://supabase.com/dashboard.
2. In **Authentication → Users**, create your personal email/password account and ensure it can sign in.
3. Disable **new public sign-ups** under your project's Auth email-provider settings. Keep email/password sign-in enabled.
4. In **SQL Editor**, run the contents of `supabase/schema.sql`. This creates task storage, progress history, and the relevant database security policies.
5. Confirm `tasks` and `daily_progress` exist, and test adding and completing a task from the application.

Your Supabase dashboard sign-in password is not automatically the password for your My Day application account.

## 4. Free Cloudflare Workers hosting

The app can be deployed to a free `*.workers.dev` address, subject to current free-tier limits. Cloudflare settings and pricing may change.

### A. Verify the production build

```cmd
cd /d D:\my-day-task-tracker
npm run check
npm run build
```

### B. Log in to Cloudflare

```cmd
npx wrangler login
npx wrangler whoami
```

If the OAuth browser callback redirects to an unreachable localhost URL, update Wrangler and use its device-login option if supported:

```cmd
npm install -D wrangler@latest
npx wrangler login --device
npx wrangler whoami
```

### C. Configure the Worker

Make sure `wrangler.jsonc` has the correct Worker name (`my-day-tracker`) and Cloudflare SvelteKit build configuration. Do not overwrite a working configuration simply to match an example.

Configure **all three variables** for the Cloudflare Worker, either under **Workers & Pages → my-day-tracker → Settings → Variables and Secrets**, or by using Wrangler configuration for the public variables and a Worker secret for the owner email:

| Variable | Type | Value |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Text | Your project's Supabase URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Text | Your project's publishable API key |
| `PRIVATE_OWNER_EMAIL` | Secret | The email of your authorized Supabase Auth user |

The project reads runtime variables using `$env/dynamic` and the Cloudflare platform environment in `src/hooks.server.ts`. Your laptop's `.env` is **not automatically copied to Cloudflare**.

For a first deployment:

```cmd
npx wrangler deploy
```

If asked to register a `workers.dev` subdomain, choose **Yes**. After the Worker exists, you can set the owner secret with:

```cmd
npx wrangler secret put PRIVATE_OWNER_EMAIL
```

The command prompts for the email value. A secret upload may publish an updated Worker version. If you configured text variables in the dashboard, make sure the changes are deployed as directed there. Avoid redeploying from local configuration that omits the public variables; verify settings after each deployment.

Subsequent releases:

```cmd
npm run deploy
```

If your hosted app shows **Configuration needed**, check the Cloudflare Worker's **Variables and Secrets** and confirm that both public Supabase variables are present in the currently deployed version. Check the private owner email too. Do not share private secret values or session tokens in support screenshots.

### D. Supabase production URL

In **Supabase → Authentication → URL Configuration**, set the Site URL to your actual `https://...workers.dev` address. Configure only the redirect URLs your authentication flow needs. Keep localhost for local testing when appropriate.

### E. Production smoke test

- Visit the deployed URL on desktop and mobile.
- Verify login/logout with your authorized account.
- Create, complete, edit, delete tasks; refresh and check persistence.
- Verify daily/monthly chart navigation and the 60% target line.
- Confirm anonymous users cannot view `/dashboard`.

## 5. Daily progress archiving (optional; destructive)

The progress summary is designed to persist even after old daily tasks are deleted. **Do not enable the scheduled deletion until you have verified database backups and tested it with dummy tasks.**

1. Enable `pg_cron` in Supabase Database Extensions if it is supported by your plan/project.
2. Run `supabase/enable-cron.sql` in Supabase SQL Editor.
3. The scheduled job runs at **00:05 Asia/Bangkok** (17:05 UTC on the preceding date), summarizes task counts and completion percentage for earlier days, and then deletes the individual past tasks within its database transaction.
4. Confirm rows appear in `daily_progress` before relying on the schedule.

To disable the scheduled job, run in Supabase SQL Editor:

```sql
select cron.unschedule('my-day-archive');
```

Once old task rows are deleted, their descriptions cannot be recovered without a backup. A missing day in the chart is not the same as 0% completion.

## 6. Project structure

```text
my-day-task-tracker/
├── src/
│   ├── lib/components/ProgressChart.svelte
│   ├── routes/dashboard/+page.svelte
│   ├── routes/dashboard/+page.server.ts
│   ├── routes/login/+page.svelte
│   ├── hooks.server.ts
│   └── app.css
├── supabase/
│   ├── schema.sql
│   └── enable-cron.sql
├── .env.example
├── .gitignore
├── package.json
├── svelte.config.js
└── wrangler.jsonc
```

## 7. Git and GitHub safety

`.gitignore` excludes local credentials, node modules, builds, temporary files, and Wrangler state. Commit `.env.example` as a template, **not** `.env`. Before pushing, run:

```cmd
git status --short
git check-ignore .env
```

If you accidentally committed `.env` previously, adding `.gitignore` does **not** unpublish it. Revoke/rotate exposed secrets and remove the sensitive data from Git history as needed.

## 8. Useful commands

```cmd
npm install          # install dependencies
npm run dev          # local development
npm run check        # Svelte and TypeScript validation
npm run build        # production build
npm run deploy       # build and deploy to Cloudflare
npx wrangler whoami  # verify Cloudflare login
```

## Limitations

- The dashboard focuses on today's tasks; future-dated tasks need an upcoming-task view to be visible early.
- Task titles and notes are not retained after scheduled archival.
- No offline-first mode, reminders, or collaborative accounts in this version.
- Free hosting and database quotas can change. Supabase Free may pause inactive projects; maintain exports/backups.
- Do not treat the project as production-security audited without testing authentication, access controls, migrations, and deployment configuration.
