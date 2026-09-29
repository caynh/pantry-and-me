import {
  isIdentityInUseError,
  isUserCancelledAuth,
  promptIdentityConflict,
} from '@/lib/identity-conflict';
import type { IdentityInUseError } from '@/lib/identity-conflict';

export async function runAuthAction(
  action: () => Promise<void>,
  resolveIdentityConflict: (error: IdentityInUseError, choice: 'merge' | 'replace') => Promise<void>,
): Promise<'ok' | 'cancel'> {
  try {
    await action();
    return 'ok';
  } catch (err) {
    if (isUserCancelledAuth(err)) return 'cancel';

    if (isIdentityInUseError(err)) {
      const choice = await promptIdentityConflict(err.credential.provider);
      if (choice === 'cancel') return 'cancel';
      await resolveIdentityConflict(err, choice);
      return 'ok';
    }

    throw err;
  }
}
