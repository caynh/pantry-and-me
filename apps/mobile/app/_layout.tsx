import 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ALWAYS_SHOW_WELCOME_WHEN_SIGNED_OUT } from '@/constants/Dev';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { IngredientsProvider } from '@/hooks/useIngredients';
import { PreferencesProvider } from '@/hooks/usePreferences';
import { SavedRecipesProvider } from '@/hooks/useSavedRecipes';
import { ThemePreferenceProvider } from '@/hooks/useTheme';
import { ExpirationRemindersSync } from '@/components/ExpirationRemindersSync';
import { FirstRunExperience } from '@/components/FirstRunExperience';
import { PrivacyAgreementProvider, usePrivacyAgreement } from '@/components/PrivacyAgreement';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'welcome',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <RootLayoutInner />
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <PrivacyAgreementProvider>
        <PreferencesProvider>
          <IngredientsProvider>
            <SavedRecipesProvider>
              <ExpirationRemindersSync />
              <RootNavigator />
              <FirstRunExperience />
            </SavedRecipesProvider>
          </IngredientsProvider>
        </PreferencesProvider>
        </PrivacyAgreementProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { onboardingReady, onboardingComplete, status, isSignedIn } = useAuth();
  const { ready: privacyReady, required: privacyRequired } = usePrivacyAgreement();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (!onboardingReady || !privacyReady || status === 'loading') return;

    const onWelcome = segments[0] === 'welcome';
    const onSignup = segments[0] === 'signup';
    const onPrivacy = segments[0] === 'privacy';
    const onConsent = segments[0] === 'privacy-consent';
    const onAuthGate = onWelcome || onSignup;

    if (privacyRequired) {
      if (!onConsent) router.replace('/privacy-consent');
      return;
    }

    if (onConsent) {
      router.replace('/(tabs)');
      return;
    }

    if (onPrivacy) return;
    // A restored session keeps an already-signed-in user out of welcome even
    // though the dev flag cleared the persisted onboarding flag.
    const pastWelcome =
      onboardingComplete || (ALWAYS_SHOW_WELCOME_WHEN_SIGNED_OUT && isSignedIn);

    if (!pastWelcome && !onAuthGate) {
      router.replace('/welcome');
      return;
    }

    if (pastWelcome && onAuthGate) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, onboardingComplete, onboardingReady, privacyReady, privacyRequired, router, segments, status]);

  useEffect(() => {
    if (onboardingReady && privacyReady && status !== 'loading') {
      void SplashScreen.hideAsync();
    }
  }, [onboardingReady, privacyReady, status]);

  if (!onboardingReady || !privacyReady || status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen
        name="privacy-consent"
        options={{ title: 'Privacy Policy', headerBackVisible: false, gestureEnabled: false }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ title: 'Scan items', presentation: 'modal' }} />
      <Stack.Screen name="barcode" options={{ title: 'Scan barcode', presentation: 'modal' }} />
      <Stack.Screen
        name="add-ingredient"
        options={{ title: 'Add ingredient', presentation: 'modal' }}
      />
      <Stack.Screen name="recipe" options={{ title: 'Recipe' }} />
      <Stack.Screen
        name="saved-recipe/[id]"
        options={{ title: 'Saved recipe', presentation: 'modal' }}
      />
      <Stack.Screen
        name="ingredient/[id]"
        options={{ title: 'Edit ingredient', presentation: 'modal' }}
      />
    </Stack>
  );
}
