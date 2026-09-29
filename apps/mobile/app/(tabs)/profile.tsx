import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View as RNView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { InlineError } from '@/components/InlineError';
import { ScreenScroll } from '@/components/ScreenScroll';
import { toUserError } from '@/lib/user-error';
import { runAuthAction } from '@/lib/run-auth-action';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth, type AuthStatus } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import { useThemePreference } from '@/hooks/useTheme';
import { ensureReminderPermissions } from '@/lib/expiration-notifications';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const {
    preferences,
    setExpirationRemindersEnabled,
    setExpirationLeadDays,
  } = usePreferences();
  const { setPreference: setThemePreference } = useThemePreference();
  const darkMode = colorScheme === 'dark';

  const handleRemindersToggle = async (enabled: boolean) => {
    if (enabled) {
      const allowed = await ensureReminderPermissions();
      if (!allowed) {
        Alert.alert(
          'Notifications blocked',
          'Enable notifications for pantry&me in system Settings to get expiration reminders. The Expiring soon list still works in the app.',
        );
        await setExpirationRemindersEnabled(false);
        return;
      }
    }
    await setExpirationRemindersEnabled(enabled);
  };
  const {
    status,
    email,
    isAnonymous,
    appleAvailable,
    error: authError,
    retry,
    linkEmailPassword,
    signInWithEmailPassword,
    signInWithApple,
    signInWithGoogle,
    resolveIdentityConflict,
    signOut,
  } = useAuth();

  const [mode, setMode] = useState<'save' | 'signin'>('save');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 'signed_out' is on its way to welcome already, and 'loading'/'error' have
  // nothing to leave yet.
  const canSignOut = status === 'identified' || status === 'anonymous' || status === 'disabled';

  const runAuth = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setFormError(null);

    try {
      const result = await runAuthAction(action, resolveIdentityConflict);
      if (result === 'ok') {
        setPasswordInput('');
        Alert.alert('Account updated', successMessage);
      }
    } catch (err) {
      setFormError(toUserError(err, 'Something went wrong. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = () => {
    if (mode === 'save') {
      void runAuth(
        () => linkEmailPassword(emailInput, passwordInput),
        'Your pantry is now tied to this email.',
      );
      return;
    }

    void runAuth(
      () => signInWithEmailPassword(emailInput, passwordInput),
      'Signed in. Your cloud pantry for this account is loaded.',
    );
  };

  const handleApple = () => {
    void runAuth(
      () => signInWithApple(),
      isAnonymous ? 'Apple is linked to this pantry.' : 'Signed in with Apple.',
    );
  };

  const handleGoogle = () => {
    void runAuth(
      () => signInWithGoogle(),
      isAnonymous ? 'Google is linked to this pantry.' : 'Signed in with Google.',
    );
  };

  // No success alert here: signing out bounces to the welcome screen, so the
  // alert would land on top of it.
  const performSignOut = async () => {
    setBusy(true);
    setFormError(null);

    try {
      await signOut();
    } catch (err) {
      setFormError(toUserError(err, 'Could not sign out. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    const prompt = describeSignOut(status);

    Alert.alert(prompt.title, prompt.message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: prompt.confirm,
        style: prompt.destructive ? 'destructive' : 'default',
        onPress: () => void performSignOut(),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenScroll>
        <Text style={styles.heading}>Settings</Text>
        <Text style={[styles.subheading, { color: colors.muted, marginBottom: 8 }]}>pantry&me</Text>

        <RNView style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <RNView style={styles.settingRow}>
            <Text style={styles.cardTitle}>Dark mode</Text>
            <Switch
              value={darkMode}
              onValueChange={(enabled) => void setThemePreference(enabled ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor={colors.background}
            />
          </RNView>
        </RNView>

        <RNView style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={{ color: colors.muted }}>{describeAccount(status, email)}</Text>
          {status === 'anonymous' ? (
            <Text style={[styles.cardHint, { color: colors.muted }]}>
              Your pantry is backed up in the cloud, but only this device can reach it until you add
              email or Apple Sign In.
            </Text>
          ) : null}
          {status === 'error' ? (
            <>
              <InlineError message={authError ?? 'Could not start your account.'} />
              <Pressable
                onPress={() => void retry()}
                style={[styles.retryButton, { borderColor: colors.tint }]}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>Try again</Text>
              </Pressable>
            </>
          ) : null}

          {status === 'anonymous' ? (
            <>
              <RNView style={styles.modeRow}>
                <Pressable
                  onPress={() => setMode('save')}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: mode === 'save' ? colors.tint : colors.background,
                      borderColor: colors.border,
                    },
                  ]}>
                  <Text
                    style={{
                      color: mode === 'save' ? colors.background : colors.text,
                      fontWeight: '600',
                    }}>
                    Save this pantry
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('signin')}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: mode === 'signin' ? colors.tint : colors.background,
                      borderColor: colors.border,
                    },
                  ]}>
                  <Text
                    style={{
                      color: mode === 'signin' ? colors.background : colors.text,
                      fontWeight: '600',
                    }}>
                    Sign in to existing
                  </Text>
                </Pressable>
              </RNView>

              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor={colors.muted}
                value={emailInput}
                onChangeText={setEmailInput}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                secureTextEntry
                placeholder="Password (6+ characters)"
                placeholderTextColor={colors.muted}
                value={passwordInput}
                onChangeText={setPasswordInput}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />

              <Pressable
                disabled={busy}
                onPress={handleEmailSubmit}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 },
                ]}>
                {busy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.primaryText, { color: colors.background }]}>
                    {mode === 'save' ? 'Save with email' : 'Sign in'}
                  </Text>
                )}
              </Pressable>

              {appleAvailable ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    colorScheme === 'dark'
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={8}
                  style={[styles.appleButton, { opacity: busy ? 0.6 : 1 }]}
                  onPress={() => {
                    if (busy) return;
                    handleApple();
                  }}
                />
              ) : null}

              <GoogleSignInButton disabled={busy} onPress={handleGoogle} />
            </>
          ) : null}

          {canSignOut ? (
            <Pressable
              disabled={busy}
              onPress={handleSignOut}
              style={[
                styles.signOutButton,
                { borderColor: status === 'anonymous' ? colors.danger : colors.border },
              ]}>
              <Text
                style={{
                  color: status === 'anonymous' ? colors.danger : colors.text,
                  fontWeight: '700',
                }}>
                {status === 'disabled' ? 'Back to welcome screen' : 'Sign out'}
              </Text>
            </Pressable>
          ) : null}

          {formError ? <InlineError message={formError} /> : null}
        </RNView>

        <RNView style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.cardTitle}>Expiration reminders</Text>
          <Text style={[styles.cardHint, { color: colors.muted }]}>
            Show an Expiring soon section on Ingredients, and optionally notify you on this device.
          </Text>
          <RNView style={styles.settingRow}>
            <Text style={{ flex: 1, fontWeight: '600' }}>Local notifications</Text>
            <Switch
              value={preferences.expirationRemindersEnabled}
              onValueChange={(enabled) => void handleRemindersToggle(enabled)}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor={colors.background}
            />
          </RNView>
          <Text style={[styles.cardHint, { color: colors.muted }]}>Remind me this many days before:</Text>
          <RNView style={styles.modeRow}>
            {([1, 3, 7] as const).map((days) => {
              const active = preferences.expirationLeadDays === days;
              return (
                <Pressable
                  key={days}
                  onPress={() => void setExpirationLeadDays(days)}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: active ? colors.tint : colors.background,
                      borderColor: active ? colors.tint : colors.border,
                    },
                  ]}>
                  <Text
                    style={{
                      color: active ? colors.background : colors.text,
                      fontWeight: '600',
                    }}>
                    {days}d
                  </Text>
                </Pressable>
              );
            })}
          </RNView>
        </RNView>

      </ScreenScroll>
    </View>
  );
}

function describeSignOut(status: AuthStatus): {
  title: string;
  message: string;
  confirm: string;
  destructive: boolean;
} {
  switch (status) {
    case 'anonymous':
      return {
        title: 'Sign out of this pantry?',
        message:
          'This pantry has no email or Apple ID attached, so signing out gives up access to it for good. Save it with an email first if you want to keep it.',
        confirm: 'Sign out anyway',
        destructive: true,
      };
    case 'disabled':
      return {
        title: 'Back to the welcome screen?',
        message: 'Your ingredients stay on this device, so nothing is lost.',
        confirm: 'Continue',
        destructive: false,
      };
    default:
      return {
        title: 'Sign out?',
        message:
          'This device returns to the welcome screen. Your account stays in the cloud, so you can sign back in.',
        confirm: 'Sign out',
        destructive: true,
      };
  }
}

function describeAccount(status: string, email: string | null): string {
  switch (status) {
    case 'disabled':
      return 'No account. Everything stays on this device.';
    case 'loading':
      return 'Starting your session...';
    case 'signed_out':
      return 'Signed out.';
    case 'anonymous':
      return 'Anonymous account, synced to the cloud';
    case 'identified':
      return `Signed in as ${email}`;
    default:
      return 'Signed out.';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    fontWeight: '700',
    fontSize: 15,
  },
  appleButton: {
    width: '100%',
    height: 44,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  signOutButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
});
