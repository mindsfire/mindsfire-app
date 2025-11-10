## mindsfire-app – Local Setup and Contributor Guide

Next.js 15 + React 19 + TypeScript + Tailwind. Auth via Clerk, data via Supabase, payments via Razorpay (test), email via Resend. This guide helps a new intern or contributor get the app running from scratch.

Branch model: `main` (production), `develop` (WIP), `feature/*` (short‑lived). Create PRs from feature branches into `develop`; promote to `main` via PR when ready for production.

---

## Prerequisites

- Node.js 20.x (LTS) or newer
- Git
- A package manager: npm (bundled with Node) or pnpm/yarn if preferred
- Browser (Chrome/Edge/Firefox) for local testing
- Accounts and dev keys (test/sandbox): Clerk, Supabase, Razorpay, Resend

Recommended (optional):
- macOS: Homebrew to install tools easily
- Windows: WSL2 (Ubuntu) for a smoother Unix‑like dev experience (optional)

---

## IDE Setup (Cursor or Windsurf)

You can use any editor, but we recommend an AI‑assisted IDE for faster onboarding:

- Cursor: https://www.cursor.com/
- Windsurf (by Codeium): https://codeium.com/windsurf

Suggested setup:
- Open the project folder in your IDE and ensure Node 20.x is detected.
- Create `.env.local` from the template below (the IDE should not commit it).
- Use the built‑in terminal to run: `npm install` then `npm run dev`.
- Configure a Run/Debug task for `npm run dev` (optional) so you can start/stop the server from the IDE UI.
- Enable TypeScript and ESLint integrations for inline diagnostics.

Nice to have extensions/settings:
- TailwindCSS IntelliSense for class hints.
- ESLint auto‑fix on save.
- Prettier (if you prefer auto‑format; follow repo style if configured).

---

## Environment Variables (.env.local)

Create a file named `.env.local` in the project root. Never commit secrets.

Common variables used by this app stack:

```
# Clerk (auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Razorpay (test mode)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Resend (emails)
RESEND_API_KEY=

# Webhooks (if configured)
WEBHOOK_SECRET=

# App version is injected from package.json by next.config.ts
# NEXT_PUBLIC_APP_VERSION is set automatically.
```

Use test/sandbox credentials. Ask your supervisor for access or use team dev accounts.

---

## Windows Setup

1) Install prerequisites
- Download Node 20 LTS from nodejs.org and install.
- Install Git for Windows.
- Optional: Install WSL2 (Ubuntu) via “Turn Windows features on/off” and Microsoft Store.

2) Clone the repo
```
git clone https://github.com/<your-org>/mindsfire-app.git
cd mindsfire-app
```

3) Create `.env.local`
- Copy the template above and paste your dev/test keys.

4) Install dependencies
```
npm install
```

5) Run the dev server
```
npm run dev
```
- Open http://localhost:3000
- Verify public pages load, and protected pages redirect to sign‑in.

6) Build and run (production mode)
```
npm run build
npm start
```

Troubleshooting (Windows):
- If ports are busy, stop other processes using port 3000 or change the port: `PORT=3001 npm run dev` (PowerShell: `$env:PORT=3001; npm run dev`).
- If OpenSSL/SSL errors occur in WSL, ensure `ca-certificates` are updated and try Node 20 LTS.

---

## macOS Setup

1) Install prerequisites
- Install Homebrew (optional): `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- `brew install node git`

2) Clone the repo
```
git clone https://github.com/<your-org>/mindsfire-app.git
cd mindsfire-app
```

3) Create `.env.local`
- Copy the template above and paste your dev/test keys.

4) Install dependencies
```
npm install
```

5) Run the dev server
```
npm run dev
```
- Open http://localhost:3000

6) Build and run (production mode)
```
npm run build
npm start
```

Troubleshooting (macOS):
- If you see permission issues, try clearing node_modules and lockfile: `rm -rf node_modules package-lock.json && npm install`.
- Apple Silicon: most deps support arm64; ensure you installed the native Node build.

---

## Scripts and Tooling

- `npm run dev` – Next.js dev server (Turbopack)
- `npm run build` – Production build
- `npm start` – Start built app
- `npm run lint` – ESLint (see `eslint.config.mjs`)

Tech notes:
- Next config exposes `NEXT_PUBLIC_APP_VERSION` from package.json (see `next.config.ts`).
- UI: Tailwind, Radix UI, lucide-react icons.
- Services: Clerk (auth), Supabase client & SSR helpers, Razorpay, Resend email, Svix webhooks.

---

## Branching & Contribution Workflow

- Default branches
  - `main` – production; protected
  - `develop` – WIP integration branch
- Feature work
  - Create from `develop`: `git checkout -b feature/<short-desc>`
  - Commit small, focused changes with clear messages
  - Open a PR into `develop`; request review
- Release
  - Merge `develop` into `main` via PR for production deployment

PR checklist (recommended):
- Runs locally; no console errors
- Lint passes (`npm run lint`)
- Includes env/config notes if needed
- Clear testing notes and screenshots for UI changes

---

## Common Issues

- 401/redirect loops on protected pages: verify Clerk keys and callback URLs; ensure you’re signed in under the correct environment.
- Supabase fetch errors: verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (test project).
- Razorpay test checkout failing: ensure test keys are used and network calls are not blocked by ad‑blockers.
- Emails not sending: confirm `RESEND_API_KEY` and that you’re using sandbox sender addresses.

---

## Security and Secrets

- Never commit `.env.local` or share secrets in screenshots.
- Use test/sandbox credentials only in development.
- Rotate any shared dev keys periodically.

---

## Need Help?

- Ask in Slack #engineering with details: what you tried, logs, screenshots.
- Include Node version (`node -v`), OS, and exact error output.

# mindsfire-app