/**
 * Development-only switches. `__DEV__` is statically false in release builds, so
 * these collapse to `false` and the surrounding branches get dropped.
 */

/**
 * Ignore the persisted "onboarding complete" flag at launch so the welcome
 * screen reappears on every reload while there is no session. An anonymous
 * session still counts as signed in, so "Continue without an account" gets past
 * it for the rest of that session.
 */
export const ALWAYS_SHOW_WELCOME_WHEN_SIGNED_OUT = __DEV__;
