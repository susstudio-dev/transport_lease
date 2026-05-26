// Edge Function: create-corporate-user
//
// Authenticates the caller as super_admin (using their JWT), then uses the
// service role to create a Supabase Auth user with the given email + a
// generated temporary password, and metadata that the handle_new_user trigger
// uses to provision a corporate_admin profile under corporateId.
//
// Request body: { email, fullName, phone?, corporateId }
// Response:     { userId, tempPassword }
//
// Note: this file runs in Deno (Supabase Edge Runtime). The Node TS project
// excludes supabase/functions, so the Deno-only globals below are safe.

// @ts-expect-error — Deno-only ESM import resolved at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// @ts-expect-error — Deno global, not present in the Node TS context.
const env = Deno.env;

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers ?? {}) },
  });
}

/** 16-char password mixing upper/lower/digits, sufficient for first sign-in. */
function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  // Guarantee at least one of each class.
  let out =
    upper[buf[0] % upper.length] + lower[buf[1] % lower.length] + digits[buf[2] % digits.length];
  for (let i = 3; i < buf.length; i++) out += all[buf[i] % all.length];
  return out;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const supabaseUrl = env.get('SUPABASE_URL');
  const serviceRoleKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  // 1. Authenticate the caller.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header.' }, { status: 401 });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: callerErr,
  } = await callerClient.auth.getUser();
  if (callerErr || !caller) {
    return json({ error: 'Invalid session.' }, { status: 401 });
  }

  // 2. Verify the caller is super_admin (service role bypasses RLS).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: callerProfile, error: profErr } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', caller.id)
    .single();
  if (profErr || !callerProfile) {
    return json({ error: 'Profile not found.' }, { status: 403 });
  }
  if (callerProfile.role !== 'super_admin' || !callerProfile.is_active) {
    return json({ error: 'Forbidden.' }, { status: 403 });
  }

  // 3. Validate body.
  let body: { email?: unknown; fullName?: unknown; phone?: unknown; corporateId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const phone =
    typeof body.phone === 'string' && body.phone.trim().length > 0 ? body.phone.trim() : null;
  const corporateId = typeof body.corporateId === 'string' ? body.corporateId : '';

  if (!isValidEmail(email)) return json({ error: 'Invalid email.' }, { status: 400 });
  if (fullName.length < 2) return json({ error: 'Full name is required.' }, { status: 400 });
  if (!isUuid(corporateId)) return json({ error: 'Invalid corporateId.' }, { status: 400 });

  // 4. Confirm the corporate exists and is active.
  const { data: corp, error: corpErr } = await admin
    .from('corporates')
    .select('id, status')
    .eq('id', corporateId)
    .maybeSingle();
  if (corpErr) return json({ error: corpErr.message }, { status: 500 });
  if (!corp) return json({ error: 'Corporate not found.' }, { status: 404 });
  if (corp.status !== 'active') {
    return json({ error: 'Cannot add users to an inactive corporate.' }, { status: 400 });
  }

  // 5. Create the auth user. The handle_new_user trigger reads metadata and
  //    creates the corporate_admin profile row automatically.
  const tempPassword = generateTempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role: 'corporate_admin',
      corporate_id: corporateId,
      full_name: fullName,
      must_change_password: true,
    },
  });

  if (createErr || !created.user) {
    const msg = createErr?.message ?? 'Failed to create user.';
    const status = msg.toLowerCase().includes('already') ? 409 : 500;
    return json({ error: msg }, { status });
  }

  // 6. Persist optional phone via a profile update.
  if (phone) {
    await admin.from('profiles').update({ phone }).eq('id', created.user.id);
  }

  return json({ userId: created.user.id, tempPassword }, { status: 201 });
}

// @ts-expect-error — Deno global, not present in the Node TS context.
Deno.serve(handler);
