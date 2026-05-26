# Fleet Leasing Portal

A B2B web platform for managing a corporate car leasing business: fleet, corporate clients, lease contracts, service requests, GST-compliant invoicing, and Razorpay payments.

> **Status:** scaffolding phase (M0). Modules will be built in order — see [Build sequencing](#build-sequencing) below.

---

## Tech stack

| Layer        | Choice                                                |
| ------------ | ----------------------------------------------------- |
| Frontend     | Vite + React 18 + TypeScript (strict)                 |
| Routing      | React Router v6                                       |
| UI           | shadcn/ui + Tailwind CSS                              |
| Server state | TanStack Query                                        |
| Client state | Zustand                                               |
| Forms        | React Hook Form + Zod                                 |
| Backend      | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Payments     | Razorpay                                              |
| PDFs         | @react-pdf/renderer                                   |
| Email / SMS  | Resend / MSG91 (via Edge Functions)                   |
| Dates        | date-fns + date-fns-tz (Asia/Kolkata)                 |
| Tables       | TanStack Table v8                                     |
| Charts       | recharts                                              |
| Toasts       | sonner                                                |
| Tests        | Vitest + Testing Library                              |

There is **no custom Node backend**. The frontend talks to Supabase directly; security is enforced by Postgres RLS policies and Edge Functions.

---

## Local setup

### Prerequisites

- Node.js **20.x** or later
- npm **10.x** or later
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (for local DB + migrations + Edge Functions)
- Docker Desktop (Supabase CLI uses it for the local Postgres)

### Install

```bash
npm install
```

### Configure environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Frontend reads only `VITE_*` variables. Other secrets are for Edge Functions and are set with `supabase secrets set`.

> Until client details are available, leave placeholders blank. The app will surface a "Complete setup" banner where appropriate.

### Run the dev server

```bash
npm run dev
```

Vite serves on http://localhost:5173.

---

## Scripts

| Command              | What it does                                           |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Start Vite dev server                                  |
| `npm run build`      | Type-check + production build                          |
| `npm run preview`    | Preview the production build                           |
| `npm run lint`       | Run ESLint                                             |
| `npm run lint:fix`   | ESLint with autofix                                    |
| `npm run format`     | Format with Prettier                                   |
| `npm run typecheck`  | TypeScript-only check (no emit)                        |
| `npm run test`       | Run Vitest once                                        |
| `npm run test:watch` | Vitest in watch mode                                   |
| `npm run db:types`   | Regenerate `src/types/database.ts` from local Supabase |
| `npm run db:reset`   | Reset local DB and re-apply migrations + seed          |
| `npm run db:push`    | Apply migrations to the linked Supabase project        |

---

## Project layout

```
src/
  app/         route components, organised per top-level area
  components/  ui (shadcn), layout, shared, domain
  features/    feature-sliced — each module owns api, hooks, schemas, types
  lib/         supabase client, formatters, pdf templates, utilities
  hooks/       cross-cutting hooks
  routes/      router config + route guards
  store/       zustand stores
  types/       generated supabase types + globals
supabase/
  migrations/  timestamped SQL migrations
  functions/   Edge Functions (webhooks, scheduled jobs, notifications)
  seed.sql     dev seed data
```

---

## Coding standards

- TypeScript `strict` + `noUncheckedIndexedAccess`. No `any`.
- Every file under 300 lines — refactor if approaching.
- Money: stored as `numeric(12,2)` in DB; client-side arithmetic uses `decimal.js-light`. Display via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Dates: stored as `timestamptz`, rendered in IST using `date-fns-tz`. Invoice dates are `date` type and treated as IST-by-convention.
- Every list view has loading skeleton, empty state, and error state — none are optional.
- All Supabase access wrapped in TanStack Query; never `useEffect + fetch`.
- All forms = React Hook Form + Zod. Schemas live alongside the feature in `features/{slice}/schemas.ts`.
- User-facing errors mapped to friendly messages via `lib/errors.ts` and surfaced through `sonner` — never raw Supabase errors.

---

## Build sequencing

| #   | Milestone                                     |
| --- | --------------------------------------------- |
| M0  | Project scaffold (current)                    |
| M1  | Database foundation — migrations, RLS, seed   |
| M2  | Authentication + role-based routing           |
| M3  | Admin shell + super_admin dashboard           |
| M4  | Corporates module                             |
| M5  | Vehicles module                               |
| M6  | Lease contracts                               |
| M7  | Corporate portal                              |
| M8  | Service requests + notifications              |
| M9  | Invoicing (manual) + GST PDF                  |
| M10 | Razorpay (orders + webhook)                   |
| M11 | Scheduled monthly invoicing + expiry alerts   |
| M12 | Notifications infrastructure (Resend + MSG91) |
| M13 | Finance module + receivables                  |
| M14 | Reports & MIS                                 |
| M15 | Hardening, tests, accessibility, docs         |

Each milestone ends with a working, reviewable surface before moving on.

---

## Deployment (target — not active yet)

- Frontend → Vercel
- Database + Auth + Storage → Supabase managed
- Edge Functions → `supabase functions deploy`
- Migrations → `supabase db push` from CI on `main`
