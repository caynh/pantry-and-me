import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { InlineError } from '@/components/InlineError';
import { ScreenScroll } from '@/components/ScreenScroll';
import { toUserError } from '@/lib/user-error';
import { runAuthAction } from '@/lib/run-auth-action';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/hooks/useAuth';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUpWithEmailPassword, resolveIdentityConflict } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setBusy(true);
    setError(null);

    try {
      const result = await runAuthAction(
        () => signUpWithEmailPassword(email, password),
        resolveIdentityConflict,
      );
      if (result === 'ok') {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(toUserError(err, 'Something went wrong. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenScroll
        bottomExtra={40}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to welcome"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}>
          <Text style={[styles.backLabel, { color: colors.tint }]}>‹ Back</Text>
        </Pressable>

        <Text style={styles.brand}>pantry&me</Text>
        <Text style={[styles.headline, { color: colors.text }]}>Create your account</Text>
        <Text style={[styles.subhead, { color: colors.muted }]}>
          Save your pantry across devices and pick up where you left off.
        </Text>

        <RNView style={styles.form}>
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
            onPress={() => void handleSignUp()}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.primaryLabel, { color: colors.background }]}>Create account</Text>
            )}
          </Pressable>
        </RNView>

        {error ? <InlineError message={error} align="center" /> : null}

        <Pressable
          disabled={busy}
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.signInLink}>
          <Text style={[styles.signInHint, { color: colors.muted }]}>
            Already have an account?{' '}
            <Text style={[styles.signInAction, { color: colors.tint }]}>Sign in</Text>
          </Text>
        </Pressable>
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
    paddingVertical: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  backLabel: {
    fontSize: 17,
    fontWeight: '600',
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
  },
  subhead: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 4,
  },
  form: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontWeight: '600',
    fontSize: 17,
  },
  signInLink: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  signInHint: {
    fontSize: 15,
    textAlign: 'center',
  },
  signInAction: {
    fontWeight: '700',
  },
});
