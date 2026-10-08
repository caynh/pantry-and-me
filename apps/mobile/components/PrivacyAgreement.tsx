import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth, type AuthStatus } from '@/hooks/useAuth';

const STORAGE_KEY = 'pantry-and-me:privacy-accepted';

interface PrivacyAgreementValue {
  /** False until we know whether this session already agreed. */
  ready: boolean;
  accepted: boolean;
  /** True once the user is in a session and still has to agree. */
  required: boolean;
  accept: () => Promise<void>;
}

const PrivacyAgreementContext = createContext<PrivacyAgreementValue | null>(null);

export function PrivacyAgreementProvider({ children }: { children: ReactNode }) {
  const { status, userId, onboardingComplete, onboardingReady } = useAuth();
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const wasInSession = useRef(false);

  const subject = agreementSubject(status, userId, onboardingComplete);
  const inSession = subject !== null;

  useEffect(() => {
    if (!onboardingReady || status === 'loading') return;

    if (wasInSession.current && !inSession) {
      void AsyncStorage.removeItem(STORAGE_KEY);
      setAccepted(false);
      setReady(true);
      wasInSession.current = false;
      return;
    }

    wasInSession.current = inSession;

    let cancelled = false;

    void (async () => {
      if (!subject) {
        if (!cancelled) {
          setAccepted(false);
          setReady(true);
        }
        return;
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (cancelled) return;
      setAccepted(stored === subject);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [inSession, onboardingReady, status, subject]);

  const accept = useCallback(async () => {
    if (!subject) return;
    await AsyncStorage.setItem(STORAGE_KEY, subject);
    setAccepted(true);
  }, [subject]);

  const value = useMemo<PrivacyAgreementValue>(
    () => ({
      ready,
      accepted,
      required: ready && inSession && !accepted,
      accept,
    }),
    [accept, accepted, inSession, ready],
  );

  return (
    <PrivacyAgreementContext.Provider value={value}>{children}</PrivacyAgreementContext.Provider>
  );
}

export function usePrivacyAgreement(): PrivacyAgreementValue {
  const value = useContext(PrivacyAgreementContext);
  if (!value) {
    throw new Error('usePrivacyAgreement must be used inside a PrivacyAgreementProvider.');
  }
  return value;
}

function agreementSubject(
  status: AuthStatus,
  userId: string | null,
  onboardingComplete: boolean,
): string | null {
  if ((status === 'anonymous' || status === 'identified') && userId) return userId;
  if (status === 'disabled' && onboardingComplete) return 'device';
  return null;
}
