import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server environment variables');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function validHost(admin: ReturnType<typeof getAdmin>, quizId: string, token: string) {
  return admin.from('host_sessions').select('id').eq('quiz_id', quizId).eq('token_hash', hashToken(token)).maybeSingle();
}
