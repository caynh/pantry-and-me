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
        <PreferencesProvider>
          <IngredientsProvider>
            <SavedRecipesProvider>
              <ExpirationRemindersSync />
              <RootNavigator />
              <FirstRunExperience />
            </SavedRecipesProvider>
          </IngredientsProvider>
        </PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { onboardingReady, onboardingComplete, status, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (!onboardingReady || status === 'loading') return;

    const onWelcome = segments[0] === 'welcome';
    const onSignup = segments[0] === 'signup';
    const onAuthGate = onWelcome || onSignup;
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
  }, [isSignedIn, onboardingComplete, onboardingReady, router, segments, status]);

  useEffect(() => {
    if (onboardingReady && status !== 'loading') {
      void SplashScreen.hideAsync();
    }
  }, [onboardingReady, status]);

  if (!onboardingReady || status === 'loading') {
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
