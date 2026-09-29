import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { DimmedModal } from '@/components/DimmedModal';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/hooks/useAuth';

type Phase = 'welcome' | 'tutorial';

interface TutorialStep {
  href: Href;
  title: string;
  body: string;
  placement: 'center' | 'top' | 'bottom';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    href: '/(tabs)',
    title: 'Your pantry',
    body: 'Ingredients is home. Search what you have, filter by pantry, fridge, or freezer, and keep an eye on anything expiring soon.',
    placement: 'bottom',
  },
  {
    href: '/(tabs)',
    title: 'Add what you have',
    body: 'Tap the + button to add an item by name, or scan a photo or barcode. You can set a location and expiration date so nothing goes to waste.',
    placement: 'top',
  },
  {
    href: '/(tabs)/recipes',
    title: 'Find recipes',
    body: 'Recipes searches the web using what is already in your pantry. Set dietary preferences and exclude foods you do not want.',
    placement: 'center',
  },
  {
    href: '/(tabs)/my-recipes',
    title: 'Save favorites',
    body: 'Heart a recipe from search and it lives in My Recipes, so you can cook it again later.',
    placement: 'center',
  },
  {
    href: '/(tabs)/profile',
    title: 'Settings',
    body: 'Save your pantry to an account, turn on expiration reminders, and switch dark mode whenever you like.',
    placement: 'center',
  },
];

export function FirstRunExperience() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const segments = useSegments();
  const { firstRunWelcomePending, completeFirstRunWelcome, onboardingComplete } = useAuth();

  const [phase, setPhase] = useState<Phase>('welcome');
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const inApp = segments[0] === '(tabs)';
  const shouldOffer = firstRunWelcomePending && onboardingComplete && inApp;

  useEffect(() => {
    if (!shouldOffer) {
      setVisible(false);
      setPhase('welcome');
      setStep(0);
      return;
    }

    const timer = setTimeout(() => setVisible(true), 280);
    return () => clearTimeout(timer);
  }, [shouldOffer]);

  useEffect(() => {
    if (!visible || phase !== 'tutorial') return;
    router.navigate(TUTORIAL_STEPS[step].href);
  }, [phase, router, step, visible]);

  const dismiss = () => {
    void completeFirstRunWelcome();
  };

  const startTutorial = () => {
    setStep(0);
    setPhase('tutorial');
  };

  const current = TUTORIAL_STEPS[step];
  const isLastStep = step === TUTORIAL_STEPS.length - 1;

  return (
    <DimmedModal
      visible={visible}
      placement={phase === 'tutorial' ? (current?.placement ?? 'center') : 'center'}>
      {phase === 'welcome' ? (
        <>
          <Text style={styles.title}>Welcome to Pantry&Me!</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            We're excited for you to try this out to help you organize your spaces, find new
            recipes, and more!
          </Text>

          <RNView style={styles.buttonColumn}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start tutorial"
              onPress={startTutorial}
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}>
              <Text style={[styles.primaryLabel, { color: colors.background }]}>Start Tutorial</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start exploring"
              onPress={dismiss}
              style={[styles.secondaryButton, { borderColor: colors.border }]}>
              <Text style={[styles.secondaryLabel, { color: colors.text }]}>Start Exploring</Text>
            </Pressable>
          </RNView>
        </>
      ) : (
        <>
          <Text style={[styles.stepIndex, { color: colors.muted }]}>
            {step + 1} of {TUTORIAL_STEPS.length}
          </Text>
          <Text style={styles.title}>{current?.title}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{current?.body}</Text>

          <RNView style={styles.tutorialActions}>
            {step > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep((currentStep) => currentStep - 1)}
                hitSlop={8}
                style={styles.textButton}>
                <Text style={[styles.textButtonLabel, { color: colors.muted }]}>Back</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={dismiss}
                hitSlop={8}
                style={styles.textButton}>
                <Text style={[styles.textButtonLabel, { color: colors.muted }]}>Skip</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isLastStep) {
                  dismiss();
                  return;
                }
                setStep((currentStep) => currentStep + 1);
              }}
              style={[styles.primaryButton, styles.nextButton, { backgroundColor: colors.tint }]}>
              <Text style={[styles.primaryLabel, { color: colors.background }]}>
                {isLastStep ? 'Done' : 'Next'}
              </Text>
            </Pressable>
          </RNView>
        </>
      )}
    </DimmedModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonColumn: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepIndex: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tutorialActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  nextButton: {
    flexGrow: 0,
    minWidth: 96,
  },
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
