# Database — M1

## Setup options

You have two ways to bring this schema to life. Pick one:

### Option A — Local Supabase (recommended for development)

Requires **Docker Desktop** running.

```bash
# Install the Supabase CLI (one-time)
npm install --global supabase

# From the project root:
supabase start          # boots local Postgres, Auth, Storage, Studio in Docker
supabase db reset       # applies all migrations + runs seed.sql
```

After `supabase start`, you get:

| Service                | URL                                                   |
| ---------------------- | ----------------------------------------------------- |
| API                    | http://localhost:54321                                |
| Studio (DB UI)         | http://localhost:54323                                |
| Inbucket (test emails) | http://localhost:54324                                |
| Postgres               | postgres://postgres:postgres@localhost:54322/postgres |

Then update `.env.local`:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<copy from `supabase status` output>
```

### Option B — Hosted Supabase project

1. Create a project at https://app.supabase.com (free tier is enough).
2. Get its **project ref** and DB password.
3. From the project root:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push        # applies migrations to the hosted DB
```

Seed.sql does **not** run automatically on hosted projects — for production, the super_admin user is created via the Supabase Auth UI or via `supabase.auth.admin.createUser()`. For a hosted dev project, you can run the seed manually in the SQL editor.

Then update `.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<from project settings → API>
```

---

## Seed credentials (local only)

All three users share password **`Admin@123`**.

| Role                   | Email               |
| ---------------------- | ------------------- |
| super_admin            | super@example.com   |
| finance                | finance@example.com |
| corporate_admin (Acme) | acme@example.com    |

The seed creates:

- 1 corporate: "Acme Logistics Pvt Ltd" (Karnataka, state code 29)
- 2 vehicles: a Maruti Dzire (leased to Acme) and a Tata Nexon EV (available)
- 1 active 12-month contract on the Dzire at ₹25,000/month

Your company's `app_settings` is seeded with placeholder values (Maharashtra, state code 27). Update via the Settings UI in M3.

---

## RLS verification — run these in the SQL editor

The single most important invariant: **`corporate_admin` cannot read or write any row outside their corporate**. Run each of these blocks while logged in (in Studio, "Run as user" selector at the bottom).

### As `super_admin` — should see all rows

```sql
select count(*) from corporates;          -- 1
select count(*) from vehicles;            -- 2
select count(*) from contracts;           -- 1
select count(*) from profiles;            -- 3
```

### As `corporate_admin` (acme@example.com) — should see only Acme's data

```sql
select count(*) from corporates;          -- 1 (just Acme)
select id, legal_name from corporates;    -- only Acme row

select count(*) from vehicles;            -- 1 (only the Dzire — leased to them)
-- The Tata Nexon (available) must NOT appear:
select id, registration_number from vehicles;

select count(*) from contracts;           -- 1 (their own)

select count(*) from profiles;            -- 1 own profile (others if same corp)
```

### As `corporate_admin` — write attempts must fail

```sql
-- Should fail with permission denied:
update corporates set legal_name = 'Hacked' where id <> current_corporate_id();
insert into vehicles (registration_number, make, model, year, fuel_type, transmission, chassis_no, engine_no)
  values ('XX99XX9999', 'Test', 'Test', 2024, 'petrol', 'manual', 'XXX', 'YYY');

-- Should fail because the contract belongs to a different corporate:
update contracts set notes = 'tampered' where corporate_id <> current_corporate_id();
```

### As `finance` — should read everything operational, write only invoices/payments

```sql
select count(*) from corporates;          -- 1
select count(*) from vehicles;            -- 2
select count(*) from contracts;           -- 1
select count(*) from invoices;            -- 0 (none yet)

-- Should fail:
update corporates set notes = 'finance edit' where id is not null;
```

---

## Cross-corporate isolation — the critical test

If you seed a second corporate, you can run this:

```sql
-- As acme@example.com:
select * from corporates where id <> current_corporate_id();   -- 0 rows
select * from vehicles where id not in (
  select vehicle_id from contracts where corporate_id = current_corporate_id()
);                                                              -- 0 rows
select * from contracts where corporate_id <> current_corporate_id();  -- 0 rows
select * from invoices where corporate_id <> current_corporate_id();   -- 0 rows
```

Any non-zero row count from these queries is a **critical RLS bug** and must be fixed before the module ships.

---

## Storage bucket conventions

Path prefix determines RLS scope. Code that uploads must follow these:

| Bucket                   | Path                                             |
| ------------------------ | ------------------------------------------------ |
| `corporate-kyc`          | `{corporate_id}/{filename}`                      |
| `vehicle-documents`      | `{vehicle_id}/{filename}`                        |
| `service-request-photos` | `{corporate_id}/{service_request_id}/{filename}` |
| `invoices`               | `{corporate_id}/{invoice_id}.pdf`                |
| `lease-agreements`       | `{corporate_id}/{contract_id}.pdf`               |

The storage RLS uses `(storage.foldername(name))[1]` to extract the first path segment and match it against the current user's corporate or, for vehicle-documents, against an active contract.

---

## Regenerating TypeScript types

After any schema change:

```bash
npm run db:types        # writes src/types/database.ts from local Postgres
```

This requires `supabase start` to be running locally.

If you can't run a local instance, update [src/types/database.ts](../src/types/database.ts) by hand to match the migrations — the file is hand-written for now.

---

## What changes if Supabase isn't connected yet

Everything in this M1 deliverable is **portable**: pure SQL files in [supabase/migrations/](../supabase/migrations) and one [supabase/seed.sql](../supabase/seed.sql). Nothing has been applied to a live database. When you set up Supabase (option A or B above), the migrations apply cleanly in one command.

The frontend is wired to talk to Supabase via [src/lib/supabase.ts](../src/lib/supabase.ts), which currently uses a stub URL when env vars are missing. Real auth and queries start working the moment you fill in `.env.local`.
