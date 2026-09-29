import { Alert } from 'react-native';

export type IdentityProvider = 'apple' | 'google' | 'email';

export type IdentityCredential =
  | { provider: 'apple'; token: string }
  | { provider: 'google'; token?: string }
  | { provider: 'email'; email: string; password: string };

/**
 * Thrown when linking would attach an identity that already belongs to
 * another pantry. The current anonymous session is left intact so the UI
 * can ask whether to merge or switch.
 */
export class IdentityInUseError extends Error {
  readonly code = 'IDENTITY_IN_USE';

  constructor(
    public readonly credential: IdentityCredential,
  ) {
    super('IDENTITY_IN_USE');
    this.name = 'IdentityInUseError';
  }
}

export function isIdentityInUseError(err: unknown): err is IdentityInUseError {
  return err instanceof IdentityInUseError;
}

export function isIdentityAlreadyLinked(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /identity is already linked|already linked to another|already registered|User already registered|email.*already|manual linking/i.test(
    message,
  );
}

export function isUserCancelledAuth(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String(err.code) : '';
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === 'ERR_REQUEST_CANCELED' ||
    code === 'ERR_CANCELED' ||
    /cancel|cancelled|canceled/i.test(message)
  );
}

export function providerLabel(provider: IdentityProvider): string {
  switch (provider) {
    case 'apple':
      return 'Apple ID';
    case 'google':
      return 'Google account';
    case 'email':
      return 'email';
  }
}

export function promptIdentityConflict(
  provider: IdentityProvider,
): Promise<'merge' | 'replace' | 'cancel'> {
  const label = providerLabel(provider);

  return new Promise((resolve) => {
    Alert.alert(
      `This ${label} already has a pantry`,
      `Would you like to merge your current items into it, or discard the temporary session and log into your existing account?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
        {
          text: 'Just log in',
          onPress: () => {
            Alert.alert(
              'Discard this pantry?',
              'Items you added in this temporary session will be left behind. Your existing account is unchanged.',
              [
                { text: 'Keep editing', style: 'cancel', onPress: () => resolve('cancel') },
                {
                  text: 'Discard and log in',
                  style: 'destructive',
                  onPress: () => resolve('replace'),
                },
              ],
            );
          },
        },
        { text: 'Merge items', onPress: () => resolve('merge') },
      ],
    );
  });
}
