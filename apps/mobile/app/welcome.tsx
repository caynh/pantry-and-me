import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
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
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const {
    appleAvailable,
    signInWithEmailPassword,
    signInWithApple,
    signInWithGoogle,
    resolveIdentityConflict,
    continueAnonymously,
  } = useAuth();

  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    router.replace('/(tabs)');
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);

    try {
      const result = await runAuthAction(action, resolveIdentityConflict);
      if (result === 'ok') finish();
    } catch (err) {
      setError(toUserError(err, 'Something went wrong. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = () => {
    void run(() => signInWithEmailPassword(email, password));
  };

  const handleSkip = () => {
    void run(() => continueAnonymously());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenScroll bottomExtra={40} contentContainerStyle={styles.content}>
        <Text style={styles.brand}>pantry&me</Text>
        <Text style={[styles.headline, { color: colors.text }]}>
          Know what you have. Cook what you can.
        </Text>

        {!isSupabaseConfigured ? (
          <RNView style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, lineHeight: 20, textAlign: 'center' }}>
              Accounts are unavailable right now. You can still use the app with ingredients stored
              on this device.
            </Text>
            <Pressable
              onPress={handleSkip}
              disabled={busy}
              style={[styles.emailButton, { backgroundColor: colors.tint, marginTop: 12 }]}>
              <Text style={[styles.emailButtonText, { color: colors.background }]}>Continue</Text>
            </Pressable>
          </RNView>
        ) : (
          <RNView style={styles.actions}>
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
                  void run(() => signInWithApple());
                }}
              />
            ) : null}

            <GoogleSignInButton
              disabled={busy}
              onPress={() => void run(() => signInWithGoogle())}
            />

            <Pressable
              disabled={busy}
              onPress={() => setShowEmail((current) => !current)}
              style={[
                styles.emailButton,
                {
                  backgroundColor: colors.tint,
                  opacity: busy ? 0.6 : 1,
                },
              ]}>
              <Text style={[styles.emailButtonText, { color: colors.background }]}>
                Continue with Email
              </Text>
            </Pressable>

            <Pressable
              disabled={busy}
              accessibilityRole="link"
              accessibilityLabel="Sign up"
              onPress={() => router.push('/signup')}
              hitSlop={8}
              style={styles.signUpLink}>
              <Text style={[styles.signUpText, { color: colors.tint }]}>Sign up</Text>
            </Pressable>

            {showEmail ? (
              <RNView style={styles.emailForm}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
                <TextInput
                  secureTextEntry
                  placeholder="Password (6+ characters)"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />

                <Pressable
                  disabled={busy}
                  onPress={handleEmail}
                  style={[
                    styles.emailButton,
                    { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 },
                  ]}>
                  {busy ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.emailButtonText, { color: colors.background }]}>
                      Sign in
                    </Text>
                  )}
                </Pressable>
              </RNView>
            ) : null}
          </RNView>
        )}

        {error ? <InlineError message={error} align="center" /> : null}

        {isSupabaseConfigured ? (
          <RNView style={styles.skipBlock}>
            <Pressable
              disabled={busy}
              onPress={handleSkip}
              hitSlop={8}
              style={styles.skipButton}>
              <Text style={[styles.skipLabel, { color: colors.muted }]}>
                Continue without an account
              </Text>
            </Pressable>
            <Text style={[styles.skipHint, { color: colors.muted }]}>
              You can create an account anytime — your pantry will be saved.
            </Text>
          </RNView>
        ) : null}

        {busy && !showEmail ? <ActivityIndicator color={colors.tint} /> : null}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  actions: {
    gap: 12,
  },
  appleButton: {
    width: '100%',
    height: 44,
  },
  emailButton: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonText: {
    fontWeight: '600',
    fontSize: 17,
  },
  emailForm: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  signUpLink: {
    alignSelf: 'center',
    paddingVertical: 2,
  },
  signUpText: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  skipBlock: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  skipHint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
