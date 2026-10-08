import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { ALWAYS_SHOW_WELCOME_WHEN_SIGNED_OUT } from '@/constants/Dev';
import { createAppleNonce } from '@/lib/apple-nonce';
import { deleteRemoteAccount } from '@/lib/api';
import { startGoogleOAuth } from '@/lib/google-auth';
import {
  IdentityInUseError,
  isIdentityAlreadyLinked,
  isIdentityInUseError,
  isUserCancelledAuth,
  type IdentityCredential,
} from '@/lib/identity-conflict';
import {
  applySnapshotToCurrentUser,
  captureAnonymousPantry,
  clearDevicePantry,
  clearPendingSnapshot,
  loadPendingSnapshot,
  resumePendingMerge,
} from '@/lib/pantry-migration';
import { supabase } from '@/lib/supabase';

const ONBOARDING_KEY = 'pantry-and-me:onboarding-complete';
const FIRST_RUN_WELCOME_KEY = 'pantry-and-me:first-run-welcome-pending';

export type AuthStatus =
  | 'disabled' // No Supabase keys — the app stays on device storage.
  | 'loading'
  | 'signed_out' // No session yet — welcome / sign-in should show.
  | 'anonymous'
  | 'identified'
  | 'error';

interface AuthContextValue {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  isSignedIn: boolean;
  appleAvailable: boolean;
  /** False until we know whether the welcome screen should appear. */
  onboardingReady: boolean;
  /** True after the user finishes the first-launch welcome flow. */
  onboardingComplete: boolean;
  error: string | null;
  retry: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Clears the first-launch flag so welcome shows again (used after sign out). */
  resetOnboarding: () => Promise<void>;
  /** Create a brand-new email account (welcome → Continue with Email). */
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  /**
   * Attach email + password to the current anonymous session (keeps the pantry),
   * or create/sign into that account if there is no session yet.
   */
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  /** Sign into an existing email account. */
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /**
   * After the user chooses Merge or Just log in on an IdentityInUseError.
   * The anonymous session is still live until this resolves.
   */
  resolveIdentityConflict: (
    error: IdentityInUseError,
    choice: 'merge' | 'replace',
  ) => Promise<void>;
  /** Skip account creation — starts an anonymous cloud session. */
  continueAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Permanently deletes the cloud account and the pantry stored with it. */
  deleteAccount: () => Promise<void>;
  /**
   * True when this session is a first-time signup or first continue-without-account.
   * Drives the welcome modal + tutorial on the main app.
   */
  firstRunWelcomePending: boolean;
  /** Call after Start Exploring or finishing/skipping the tutorial. */
  completeFirstRunWelcome: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'disabled');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [firstRunWelcomePending, setFirstRunWelcomePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = useRef(false);

  const applyUser = useCallback(
    (user: { id: string; email?: string | null; is_anonymous?: boolean } | null) => {
      if (!user) {
        setUserId(null);
        setEmail(null);
        setIsAnonymous(false);
        setStatus(supabase ? 'signed_out' : 'disabled');
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);
      setIsAnonymous(Boolean(user.is_anonymous));
      setStatus(user.is_anonymous || !user.email ? 'anonymous' : 'identified');
    },
    [],
  );

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setOnboardingComplete(true);
  }, []);

  const markFirstRunWelcome = useCallback(async () => {
    await AsyncStorage.setItem(FIRST_RUN_WELCOME_KEY, '1');
    setFirstRunWelcomePending(true);
  }, []);

  const completeFirstRunWelcome = useCallback(async () => {
    await AsyncStorage.removeItem(FIRST_RUN_WELCOME_KEY);
    setFirstRunWelcomePending(false);
  }, []);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    await AsyncStorage.removeItem(FIRST_RUN_WELCOME_KEY);
    setOnboardingComplete(false);
    setFirstRunWelcomePending(false);
  }, []);

  const restoreSession = useCallback(async () => {
    if (!supabase || busy.current) return;

    busy.current = true;
    setError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user ?? null;
      if (user) {
        await resumePendingMerge(user.id);
      }
      applyUser(user);
    } catch (err) {
      setStatus('error');
      setError(describeAuthError(err));
    } finally {
      busy.current = false;
    }
  }, [applyUser]);

  useEffect(() => {
    void (async () => {
      const pendingWelcome = await AsyncStorage.getItem(FIRST_RUN_WELCOME_KEY);
      setFirstRunWelcomePending(pendingWelcome === '1');

      if (ALWAYS_SHOW_WELCOME_WHEN_SIGNED_OUT) {
        // Drop the flag rather than skipping the read, so completeOnboarding()
        // can still take effect for the rest of this session.
        await AsyncStorage.removeItem(ONBOARDING_KEY);
        setOnboardingComplete(false);
        setOnboardingReady(true);
        return;
      }

      const flag = await AsyncStorage.getItem(ONBOARDING_KEY);
      setOnboardingComplete(flag === '1');
      setOnboardingReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!supabase) {
      setStatus('disabled');
      return;
    }

    void restoreSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, [applyUser, restoreSession]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase?.auth.startAutoRefresh();
        const currentId = supabase?.auth.getSession().then(({ data }) => {
          if (data.session?.user.id) void resumePendingMerge(data.session.user.id);
        });
        void currentId;
      } else {
        supabase?.auth.stopAutoRefresh();
      }
    });

    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    return () => subscription.remove();
  }, []);

  const snapshotIfAnonymous = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user?.is_anonymous) return null;
    return captureAnonymousPantry(user.id);
  }, []);

  const finishIdentified = useCallback(
    async (
      user: { id: string; email?: string | null; is_anonymous?: boolean; created_at?: string } | null,
      options?: { firstRun?: boolean },
    ) => {
      if (!user) throw new Error('Sign-in did not finish. Try again.');
      if (options?.firstRun) {
        await markFirstRunWelcome();
      }
      applyUser(user);
      await completeOnboarding();
    },
    [applyUser, completeOnboarding, markFirstRunWelcome],
  );

  /**
   * After a successful identity attach: same UID means linking worked and the
   * pantry is already in place. A different UID means Supabase created or
   * switched to another user — apply the snapshot so nothing is left behind.
   */
  const settleAfterIdentity = useCallback(
    async (previousUserId: string | null, nextUserId: string) => {
      const snapshot = await loadPendingSnapshot();
      if (!snapshot) return;

      if (!previousUserId || previousUserId === nextUserId) {
        await clearPendingSnapshot();
        return;
      }

      await applySnapshotToCurrentUser(snapshot, nextUserId);
    },
    [],
  );

  const continueAnonymously = useCallback(async () => {
    if (!supabase) {
      await markFirstRunWelcome();
      await completeOnboarding();
      return;
    }

    setError(null);
    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) throw new Error(describeAuthError(signInError));
    applyUser(data.user);
    await markFirstRunWelcome();
    await completeOnboarding();
  }, [applyUser, completeOnboarding, markFirstRunWelcome]);

  const signUpWithEmailPassword = useCallback(
    async (rawEmail: string, password: string) => {
      if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

      const emailValue = rawEmail.trim().toLowerCase();
      assertEmailPassword(emailValue, password);
      setError(null);

      const previous = await snapshotIfAnonymous();
      const previousUserId = previous?.fromUserId ?? null;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailValue,
        password,
      });

      if (signUpError) {
        if (isIdentityAlreadyLinked(signUpError)) {
          throw new IdentityInUseError({ provider: 'email', email: emailValue, password });
        }
        throw new Error(describeAuthError(signUpError));
      }

      if (!data.session || !data.user) {
        await markFirstRunWelcome();
        throw new Error('Check your email to confirm the account, then sign in.');
      }

      await settleAfterIdentity(previousUserId, data.user.id);
      await finishIdentified(data.user, { firstRun: true });
    },
    [finishIdentified, markFirstRunWelcome, settleAfterIdentity, snapshotIfAnonymous],
  );

  const linkEmailPassword = useCallback(
    async (rawEmail: string, password: string) => {
      if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

      const emailValue = rawEmail.trim().toLowerCase();
      assertEmailPassword(emailValue, password);
      setError(null);

      await snapshotIfAnonymous();

      // Supabase equivalent of Firebase linkWithCredential for email:
      // updateUser keeps the same UID, so ingredients.user_id stays valid.
      const { data, error: updateError } = await supabase.auth.updateUser({
        email: emailValue,
        password,
      });

      if (updateError) {
        if (isIdentityAlreadyLinked(updateError)) {
          throw new IdentityInUseError({ provider: 'email', email: emailValue, password });
        }
        throw new Error(describeAuthError(updateError));
      }

      await clearPendingSnapshot();
      await finishIdentified(data.user);
    },
    [finishIdentified, snapshotIfAnonymous],
  );

  const signInWithEmailPassword = useCallback(
    async (rawEmail: string, password: string) => {
      if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

      const emailValue = rawEmail.trim().toLowerCase();
      assertEmailPassword(emailValue, password);
      setError(null);

      const previous = await snapshotIfAnonymous();
      if (previous) {
        // Still anonymous — do not swap sessions until the user picks merge or discard.
        throw new IdentityInUseError({ provider: 'email', email: emailValue, password });
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password,
      });

      if (signInError) throw new Error(describeAuthError(signInError));
      if (!data.user) throw new Error('Sign-in did not finish. Try again.');

      await finishIdentified(data.user);
    },
    [finishIdentified, snapshotIfAnonymous],
  );

  const signInWithApple = useCallback(async () => {
    if (!supabase) throw new Error('Cloud accounts are unavailable right now.');
    if (Platform.OS !== 'ios') throw new Error('Sign in with Apple is only available on iOS.');

    setError(null);

    const previous = await snapshotIfAnonymous();
    const previousUserId = previous?.fromUserId ?? null;
    const { raw: nonce, hashed } = await createAppleNonce();

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign-in did not finish. Try again.');
    }

    const appleCredential: IdentityCredential = {
      provider: 'apple',
      token: credential.identityToken,
      nonce,
    };

    // linkIdentity(..., token) is the Supabase equivalent of Firebase
    // linkWithCredential(): same UID, pantry rows stay put. signInWithIdToken
    // is only used when there is no anonymous session to claim.
    const { data, error: appleError } = previousUserId
      ? await supabase.auth.linkIdentity({
          provider: 'apple',
          token: credential.identityToken,
          nonce,
        })
      : await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce,
        });

    if (appleError) {
      if (isIdentityAlreadyLinked(appleError)) {
        throw new IdentityInUseError(appleCredential);
      }
      throw new Error(describeAuthError(appleError));
    }

    if (!data.user) throw new Error('Apple sign-in did not finish. Try again.');

    await saveAppleDisplayName(data.user.id, credential.fullName);
    await settleAfterIdentity(previousUserId, data.user.id);
    await finishIdentified(data.user, { firstRun: isNewlyCreatedUser(data.user) });
  }, [finishIdentified, settleAfterIdentity, snapshotIfAnonymous]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

    setError(null);

    const previous = await snapshotIfAnonymous();
    const previousUserId = previous?.fromUserId ?? null;
    const googleCredential: IdentityCredential = { provider: 'google' };

    try {
      // linkIdentity keeps the anonymous UID when the Google account is new.
      // signInWithOAuth is used when there is no session to claim.
      const data = await startGoogleOAuth(previousUserId ? 'link' : 'signIn');
      const user = data.user ?? null;
      if (!user) throw new Error('Google sign-in did not finish. Try again.');

      await settleAfterIdentity(previousUserId, user.id);
      await finishIdentified(user, { firstRun: isNewlyCreatedUser(user) });
    } catch (err) {
      if (isIdentityInUseError(err) || isUserCancelledAuth(err)) throw err;
      if (isIdentityAlreadyLinked(err)) {
        throw new IdentityInUseError(googleCredential);
      }
      throw new Error(describeAuthError(err));
    }
  }, [finishIdentified, settleAfterIdentity, snapshotIfAnonymous]);

  const resolveIdentityConflict = useCallback(
    async (conflict: IdentityInUseError, choice: 'merge' | 'replace') => {
      if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

      setError(null);

      const snapshot = await loadPendingSnapshot();

      // Never signOut() here. The anonymous JWT stays valid until the
      // destination session is confirmed, so a network failure cannot
      // leave the user with no session.
      if (choice === 'replace') {
        await clearPendingSnapshot();
      }

      let nextUserId: string | null = null;

      if (conflict.credential.provider === 'email') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: conflict.credential.email,
          password: conflict.credential.password,
        });
        if (signInError) throw new Error(describeAuthError(signInError));
        nextUserId = data.user?.id ?? null;
      } else if (conflict.credential.provider === 'apple') {
        const { data, error: appleError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: conflict.credential.token,
          nonce: conflict.credential.nonce,
        });
        if (appleError) throw new Error(describeAuthError(appleError));
        nextUserId = data.user?.id ?? null;
      } else {
        const data = await startGoogleOAuth('signIn');
        nextUserId = data.user?.id ?? null;
      }

      if (!nextUserId) throw new Error('Sign-in did not finish. Try again.');

      if (choice === 'merge' && snapshot) {
        await applySnapshotToCurrentUser(snapshot, nextUserId);
      }

      const { data } = await supabase.auth.getUser();
      await finishIdentified(data.user);
    },
    [finishIdentified],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      await resetOnboarding();
      return;
    }

    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw new Error(describeAuthError(signOutError));
    applyUser(null);
    await resetOnboarding();
  }, [applyUser, resetOnboarding]);

  const deleteAccount = useCallback(async () => {
    if (!supabase) throw new Error('Cloud accounts are unavailable right now.');

    setError(null);
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(describeAuthError(sessionError));

    const token = data.session?.access_token;
    if (!token) throw new Error('Sign in before deleting your account.');

    await deleteRemoteAccount(token);

    try {
      await clearDevicePantry();
    } catch {
      // The account is already deleted. Keep going so this device does not stay signed in.
    }

    try {
      // The server user is already gone, so only the session stored on this device remains.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Same as above: deletion succeeded even if the local session clear throws.
    }

    applyUser(null);
    await resetOnboarding();
  }, [applyUser, resetOnboarding]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      userId,
      email,
      isAnonymous,
      isSignedIn: Boolean(userId),
      appleAvailable,
      onboardingReady,
      onboardingComplete,
      error,
      retry: restoreSession,
      completeOnboarding,
      resetOnboarding,
      signUpWithEmailPassword,
      linkEmailPassword,
      signInWithEmailPassword,
      signInWithApple,
      signInWithGoogle,
      resolveIdentityConflict,
      continueAnonymously,
      signOut,
      deleteAccount,
      firstRunWelcomePending,
      completeFirstRunWelcome,
    }),
    [
      appleAvailable,
      completeFirstRunWelcome,
      completeOnboarding,
      continueAnonymously,
      deleteAccount,
      email,
      error,
      firstRunWelcomePending,
      isAnonymous,
      linkEmailPassword,
      onboardingComplete,
      onboardingReady,
      resetOnboarding,
      resolveIdentityConflict,
      restoreSession,
      signInWithApple,
      signInWithEmailPassword,
      signInWithGoogle,
      signOut,
      signUpWithEmailPassword,
      status,
      userId,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}

async function saveAppleDisplayName(
  userId: string,
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
) {
  if (!supabase || !fullName) return;

  const displayName = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim();
  if (!displayName) return;

  try {
    await supabase.auth.updateUser({ data: { display_name: displayName, full_name: displayName } });
    await supabase
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    // Apple only sends the name once. A failed profile write should not undo sign-in.
  }
}

function isNewlyCreatedUser(user: { created_at?: string | null }): boolean {
  if (!user.created_at) return false;
  const createdAt = Date.parse(user.created_at);
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < 120_000;
}

function assertEmailPassword(email: string, password: string) {
  if (!email.includes('@')) {
    throw new Error('Enter a valid email address.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

function describeAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Could not start a session.';

  if (/anonymous.*disabled|signups not allowed/i.test(message)) {
    return 'Cloud accounts are unavailable right now. Continue without an account, or try again later.';
  }

  if (/manual linking|identity.*already|already.*registered|User already registered/i.test(message)) {
    return 'That email is already registered. Switch to Sign in instead.';
  }

  if (/Invalid login credentials/i.test(message)) {
    return 'Wrong email or password.';
  }

  if (/Email not confirmed/i.test(message)) {
    return 'Confirm your email from the link we sent, then try again.';
  }

  if (/provider is not enabled|Unsupported provider/i.test(message)) {
    return 'That sign-in option is not turned on yet.';
  }

  if (/JWT|row-level|RLS|PGRST|postgres|supabase|status \d+|ECONNREFUSED|network request failed|https?:\/\/|localhost/i.test(message)) {
    return 'Could not start your account. Try again, or continue without one.';
  }

  return message;
}
