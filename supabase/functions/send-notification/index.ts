// Edge Function: send-notification
//
// Sends one email (Resend) or SMS (MSG91) and records the attempt in
// public.notifications_log. Best-effort: returns 200 even on provider failure
// so callers don't break the user-facing flow — the log captures the failure.
//
// Body: { channel, recipient, subject?, body, relatedEntityType?, relatedEntityId?, corporateId? }
// Response: { ok, status, providerMessageId?, errorMessage? }
//
// If provider credentials are missing (Resend key for email, MSG91 key for
// SMS), the log row is written with status='queued' and ok=true so the rest of
// the system keeps working — a separate worker (M11+) can drain the queue
// once secrets are configured.

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

type Channel = 'email' | 'sms';
type Body = {
  channel?: unknown;
  recipient?: unknown;
  subject?: unknown;
  body?: unknown;
  relatedEntityType?: unknown;
  relatedEntityId?: unknown;
  corporateId?: unknown;
};

function isChannel(v: unknown): v is Channel {
  return v === 'email' || v === 'sms';
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhone(v: string): boolean {
  // Permissive: digits with optional + and spaces/dashes
  return /^[+0-9\- ]{7,20}$/.test(v);
}

async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
  apiKey: string;
  from: string;
}): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      from: args.from,
      to: args.to,
      subject: args.subject,
      text: args.body,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text.slice(0, 500) };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, providerId: data.id };
}

async function sendSms(args: {
  to: string;
  body: string;
  authKey: string;
  senderId: string;
  templateId: string;
}): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  // MSG91 v5 flow API. body is sent as variable {{var}} substitution; for
  // simple text we wrap it in a generic var per their template config.
  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authkey: args.authKey,
    },
    body: JSON.stringify({
      template_id: args.templateId,
      sender: args.senderId,
      mobiles: args.to.replace(/[^0-9]/g, ''),
      VAR1: args.body,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text.slice(0, 500) };
  }
  const data = (await res.json()) as { request_id?: string; type?: string; message?: string };
  if (data.type && data.type !== 'success') {
    return { ok: false, error: data.message ?? 'MSG91 returned non-success' };
  }
  return { ok: true, providerId: data.request_id };
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(
      { ok: false, status: 'failed', errorMessage: 'Method not allowed' },
      { status: 405 },
    );
  }

  const supabaseUrl = env.get('SUPABASE_URL');
  const serviceRoleKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(
      { ok: false, status: 'failed', errorMessage: 'Server is misconfigured.' },
      { status: 500 },
    );
  }

  // Caller must be authenticated. Either role can trigger.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(
      { ok: false, status: 'failed', errorMessage: 'Missing Authorization.' },
      { status: 401 },
    );
  }
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await callerClient.auth.getUser();
  if (userErr || !user) {
    return json({ ok: false, status: 'failed', errorMessage: 'Invalid session.' }, { status: 401 });
  }

  // Validate input.
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ ok: false, status: 'failed', errorMessage: 'Invalid JSON.' }, { status: 400 });
  }
  if (!isChannel(body.channel)) {
    return json(
      { ok: false, status: 'failed', errorMessage: 'channel must be email or sms.' },
      { status: 400 },
    );
  }
  const channel = body.channel;
  const recipient = typeof body.recipient === 'string' ? body.recipient.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : null;
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  const relatedEntityType =
    typeof body.relatedEntityType === 'string' ? body.relatedEntityType : null;
  const relatedEntityId = typeof body.relatedEntityId === 'string' ? body.relatedEntityId : null;
  const corporateId = typeof body.corporateId === 'string' ? body.corporateId : null;

  if (!recipient || text.length === 0) {
    return json(
      { ok: false, status: 'failed', errorMessage: 'recipient and body are required.' },
      { status: 400 },
    );
  }
  if (channel === 'email' && !isEmail(recipient)) {
    return json(
      { ok: false, status: 'failed', errorMessage: 'Invalid email address.' },
      { status: 400 },
    );
  }
  if (channel === 'sms' && !isPhone(recipient)) {
    return json(
      { ok: false, status: 'failed', errorMessage: 'Invalid phone number.' },
      { status: 400 },
    );
  }

  // Service-role client for log writes (notifications_log has no INSERT policy).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let providerId: string | null = null;
  let providerErr: string | null = null;
  let status: 'sent' | 'failed' | 'queued' = 'queued';

  if (channel === 'email') {
    const apiKey = env.get('RESEND_API_KEY');
    const from = env.get('RESEND_FROM_EMAIL');
    if (apiKey && from) {
      const r = await sendEmail({
        to: recipient,
        subject: subject ?? '(no subject)',
        body: text,
        apiKey,
        from,
      });
      providerId = r.providerId ?? null;
      providerErr = r.error ?? null;
      status = r.ok ? 'sent' : 'failed';
    } else {
      status = 'queued';
      providerErr = 'RESEND not configured';
    }
  } else {
    const authKey = env.get('MSG91_AUTH_KEY');
    const senderId = env.get('MSG91_SENDER_ID');
    const templateId = env.get('MSG91_TEMPLATE_ID');
    if (authKey && senderId && templateId) {
      const r = await sendSms({
        to: recipient,
        body: text,
        authKey,
        senderId,
        templateId,
      });
      providerId = r.providerId ?? null;
      providerErr = r.error ?? null;
      status = r.ok ? 'sent' : 'failed';
    } else {
      status = 'queued';
      providerErr = 'MSG91 not configured';
    }
  }

  await admin.from('notifications_log').insert({
    channel,
    recipient,
    subject,
    body_excerpt: text.slice(0, 280),
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId,
    corporate_id: corporateId,
    status,
    provider_message_id: providerId,
    error_message: providerErr,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  });

  return json({
    ok: status !== 'failed',
    status,
    providerMessageId: providerId,
    errorMessage: providerErr,
  });
}

// @ts-expect-error — Deno global, not present in the Node TS context.
Deno.serve(handler);
