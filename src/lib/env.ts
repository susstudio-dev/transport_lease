import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().or(z.literal('')),
  VITE_SUPABASE_ANON_KEY: z.string(),
  VITE_RAZORPAY_KEY_ID: z.string().optional().default(''),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed. Check .env.local against .env.example.');
}

export const env = parsed.data;

export const isSupabaseConfigured =
  env.VITE_SUPABASE_URL.length > 0 && env.VITE_SUPABASE_ANON_KEY.length > 0;
