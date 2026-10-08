import { useState } from 'react';
import { Pressable, StyleSheet, View as RNView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { PrivacyPolicyBody } from '@/components/PrivacyPolicyBody';
import { ScreenScroll } from '@/components/ScreenScroll';
import { usePrivacyAgreement } from '@/components/PrivacyAgreement';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function PrivacyConsentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { accept } = usePrivacyAgreement();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const agree = () => {
    if (!checked || saving) return;
    setSaving(true);
    void accept().finally(() => setSaving(false));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenScroll>
        <Text style={[styles.lead, { color: colors.muted }]}>
          Read this before using pantry&me. You need to agree before the app opens.
        </Text>
        <PrivacyPolicyBody />
      </ScreenScroll>

      <RNView
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <RNView style={styles.agreeRow}>
          <Text style={[styles.agreeCopy, { color: colors.text }]}>I agree to the Privacy Policy</Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel="I agree to the Privacy Policy"
            hitSlop={8}
            onPress={() => setChecked((current) => !current)}
            style={[
              styles.box,
              {
                borderColor: checked ? colors.tint : colors.border,
                backgroundColor: checked ? colors.tint : colors.background,
              },
            ]}>
            {checked ? <Text style={[styles.check, { color: colors.background }]}>✓</Text> : null}
          </Pressable>
        </RNView>
        <Pressable
          accessibilityRole="button"
          disabled={!checked || saving}
          onPress={agree}
          style={[
            styles.continueButton,
            { backgroundColor: colors.tint, opacity: checked && !saving ? 1 : 0.45 },
          ]}>
          <Text style={[styles.continueLabel, { color: colors.background }]}>Continue</Text>
        </Pressable>
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lead: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agreeCopy: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  continueButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
});
