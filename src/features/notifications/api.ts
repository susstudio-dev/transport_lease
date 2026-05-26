import { supabase } from '@/lib/supabase';

export type NotificationPayload = {
  channel: 'email' | 'sms';
  recipient: string;
  subject?: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  corporateId?: string;
};

export type NotificationResult = {
  ok: boolean;
  status: 'sent' | 'failed' | 'queued';
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

/**
 * Invokes the send-notification Edge Function. Best-effort: never throws —
 * notification failures should not block the surrounding business action.
 */
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke<NotificationResult>(
      'send-notification',
      { body: payload },
    );
    if (error) {
      return { ok: false, status: 'failed', errorMessage: error.message };
    }
    return data ?? { ok: false, status: 'failed', errorMessage: 'No response.' };
  } catch (e) {
    return {
      ok: false,
      status: 'failed',
      errorMessage: e instanceof Error ? e.message : 'Unknown error.',
    };
  }
}
