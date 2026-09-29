import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isIdentityAlreadyLinked, IdentityInUseError } from '@/lib/identity-conflict';

WebBrowser.maybeCompleteAuthSession();

function redirectTo(): string {
  return makeRedirectUri({ scheme: 'pantryandme', path: 'auth' });
}

function readOAuthError(url: string): string | null {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return errorCode;
  if (typeof params.error_description === 'string') return params.error_description;
  if (typeof params.error === 'string') return params.error;
  return null;
}

async function createSessionFromUrl(url: string): Promise<{ user: User | null }> {
  if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

  const oauthError = readOAuthError(url);
  if (oauthError) {
    if (isIdentityAlreadyLinked(oauthError)) {
      throw new IdentityInUseError({ provider: 'google' });
    }
    throw new Error(oauthError);
  }

  const { params } = QueryParams.getQueryParams(url);
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken) {
    throw new Error('Google sign-in did not finish. Try again.');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });
  if (error) throw error;
  return { user: data.user };
}

/**
 * Opens Google through Supabase Auth (browser sheet). Who sets this up:
 * you, in Google Cloud Console (Web client) and the Supabase dashboard
 * (Authentication → Providers → Google). See docs/supabase-auth.md.
 */
export async function startGoogleOAuth(mode: 'signIn' | 'link'): Promise<{ user: User | null }> {
  if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

  const redirect = redirectTo();
  const request =
    mode === 'link'
      ? await supabase.auth.linkIdentity({
          provider: 'google',
          options: { redirectTo: redirect, skipBrowserRedirect: true },
        })
      : await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirect, skipBrowserRedirect: true },
        });

  if (request.error) {
    if (isIdentityAlreadyLinked(request.error)) {
      throw new IdentityInUseError({ provider: 'google' });
    }
    throw request.error;
  }

  if (!request.data.url) {
    throw new Error('Google sign-in did not finish. Try again.');
  }

  const result = await WebBrowser.openAuthSessionAsync(request.data.url, redirect);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    const cancel = new Error('cancelled');
    (cancel as Error & { code: string }).code = 'ERR_REQUEST_CANCELED';
    throw cancel;
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in did not finish. Try again.');
  }

  try {
    return await createSessionFromUrl(result.url);
  } catch (err) {
    if (isIdentityAlreadyLinked(err) || err instanceof IdentityInUseError) throw err;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return { user: data.session.user };
    throw err;
  }
}
