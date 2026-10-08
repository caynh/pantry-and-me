import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { readBearerToken } from '@/lib/account-auth';

/**
 * Deletes the signed-in Supabase user. Cascades remove profile, ingredients,
 * preferences, and saved recipes. The admin API also revokes a Sign in with
 * Apple refresh token when the Apple provider is configured.
 */
export async function POST(request: Request) {
  const token = readBearerToken(request.headers.get('authorization'));

  if (!token) {
    return NextResponse.json({ error: 'Sign in before deleting your account.' }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Account deletion is unavailable right now. Try again later.' },
      { status: 503 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json({ error: 'Sign in before deleting your account.' }, { status: 401 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);

  if (deleteError) {
    console.error('Account deletion failed:', deleteError.message);
    return NextResponse.json(
      { error: 'Could not delete your account. Try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: true });
}
