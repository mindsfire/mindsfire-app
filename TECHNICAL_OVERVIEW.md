# mindsfire-app – Technical Overview

> High-level architecture and data model overview for the customer + operations dashboard (managers, virtual assistants, admins). Safe to commit: contains no secrets.

## Purpose and personas
- **Customers**: Submit work requests, track status, view invoices, manage plan.
- **Virtual Assistants (VAs)**: Work on assigned customer requests, add updates/files.
- **Managers/Admins**: Configure plans, assign VAs, oversee workloads, audit activity.

## Architecture at a glance
- **Framework**: Next.js 15 (app router, Server Components, Turbopack dev) + React 19 + TypeScript.
- **Styling/UI**: Tailwind CSS (v4), Radix primitives, lucide icons.
- **AuthN/AuthZ**: Clerk for authentication; server-side guard in dashboard layout. App roles enforced in Supabase (RLS + `is_admin()`) and app logic.
- **Data**: Supabase Postgres for primary data + Storage for files. Access via Supabase JS client and admin service role on the server.
- **Payments**: Razorpay (test) for checkout and billing intents.
- **Email**: Resend for transactional messages.
- **Webhooks**: Svix (placeholder) for inbound events (e.g., payments/webhooks) with shared secret verification.
- **Deployment**: Next.js build output served by `next start`; `next.config.ts` exposes `NEXT_PUBLIC_APP_VERSION` from `package.json`.

## High-level request lifecycle
1) User signs in via Clerk → profile auto-provisioned in Supabase (`profiles` table). 
2) Customer submits a **request** (work item). Initial status: `new` with priority enum.
3) Manager assigns a primary VA (and optional secondary) via `va_assignments`.
4) VAs update the request thread (`request_messages`) and attach files (`request_files` metadata; bytes stored in Supabase Storage).
5) Status transitions (`in_progress` → `on_hold` → `done` or `cancelled`) recorded with `updated_at` trigger; key actions can be mirrored in `audit_logs`.
6) Billing: `subscriptions` track plan linkage; `invoices` capture charges; Razorpay handles payment collection (test mode in dev).

## Data model (Supabase)
Key tables/enums from `supabase/schema.dev.sql` (idempotent, no secrets):
- **Enums**: `request_priority (low|medium|high|urgent)`, `request_status (new|in_progress|on_hold|done|cancelled)`, `subscription_status (trialing|active|past_due|canceled)`, `invoice_status (open|paid|void|uncollectible)`.
- **profiles**: Mirrors auth user; role (customer/admin), contact fields, Clerk ID mapping.
- **user_sessions**: App-level sessions per device for future revoke/visibility UX.
- **va_assignments**: Maps customer → primary/secondary VA; unique active assignment per customer.
- **plans**: Plan catalog with JSONB features; public read, admin-managed.
- **subscriptions**: Customer ↔ plan link with period bounds and status.
- **requests**: Core work items with priority, status, due date, assignee.
- **request_messages**: Threaded messages on a request.
- **request_files**: File metadata for request attachments (Storage holds bytes).
- **invoices**: Basic billing records (amount, status, external invoice id).
- **audit_logs**: Generic audit trail (actor, action, entity, metadata).

### Row Level Security (RLS) highlights
- Enabled on all user-facing tables (`profiles`, `plans`, `subscriptions`, `requests`, `request_messages`, `request_files`, `invoices`, `audit_logs`).
- Helper `is_admin()` used for admin bypass.
- Example policies: customers read/update own profile; plans readable by all but writable only by admins; sessions scoped to owner or admin.
- Server uses Supabase Service Role where necessary (e.g., admin data fetches in Server Components).

## AuthZ and routing
- Dashboard layout (`src/app/(dashboard)/layout.tsx`) enforces Clerk auth server-side, redirecting unauthenticated users to `/login?redirect=/overview`.
- Role-aware data access should be enforced via Supabase policies and app checks in loaders/actions. VAs and managers map to Supabase `profiles.role` (extend as needed).

## Frontend composition
- App Router with nested layouts; dashboard uses Server Components with Suspense for skeletons and data waterfalls (e.g., `Overview` → `PlansSection`).
- Version badge reads from `package.json` to display deployed version.
- Tailwind utility-first styling; Radix for accessible primitives.

## Integrations (non-secret)
- **Clerk**: Auth, user provisioning; profile sync via trigger in `schema.dev.sql`.
- **Supabase**: Database + Storage; admin client for server-side fetches; standard client for browser with RLS.
- **Razorpay**: Test-mode payments; keys set via env (not committed).
- **Resend**: Transactional email delivery.
- **Svix/webhooks**: For verifying inbound events (e.g., payments); secret configured via env.

## Environments & configuration
- Environment variables defined in `.env.local` template (see `README.md`); never commit secrets.
- `NEXT_PUBLIC_*` keys safe for browser exposure; server-only secrets kept out of VCS.
- Use test/sandbox credentials in development.

## Operational notes
- **Scripts**: `npm run dev` (Turbopack), `npm run build`, `npm start`, `npm run lint`.
- **Branch model**: `main` (prod), `develop` (integration), `feature/*` short-lived.
- **Logging/observability**: Minimal in-repo; consider adding structured logging and request tracing for production.

## Extensibility hooks
- Add roles (manager/va) by extending `profiles.role` enum and RLS policies; mirror in Clerk metadata and app guards.
- Enhance billing by linking `invoices` to external processor IDs and webhook handlers.
- Expand audit coverage by writing key mutations to `audit_logs` via database triggers or app layer.

## Security reminders
- Keep secrets out of the repo; `.env.local` is gitignored.
- RLS is the primary enforcement layer; avoid bypassing it from client-side Supabase calls.
- Validate webhook signatures (Svix) and payment events (Razorpay) server-side.
