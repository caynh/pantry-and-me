import { StyleSheet, View as RNView } from 'react-native';
import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_UPDATED,
  privacyContactSentence,
} from '@pantry-and-me/shared';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export function PrivacyPolicyBody() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <RNView style={styles.wrap}>
      <Text style={[styles.updated, { color: colors.muted }]}>
        Last updated {PRIVACY_POLICY_UPDATED}.
      </Text>
      <Text style={styles.paragraph}>{PRIVACY_POLICY_INTRO}</Text>
      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <RNView key={section.title} style={styles.section}>
          <Text style={styles.heading}>{section.title}</Text>
          {section.bullets?.map((bullet) => (
            <Text key={bullet.label} style={styles.paragraph}>
              <Text style={styles.label}>{bullet.label}. </Text>
              {bullet.text}
            </Text>
          ))}
          {section.paragraphs?.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </RNView>
      ))}
      <RNView style={styles.section}>
        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.paragraph}>{privacyContactSentence()}</Text>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    paddingBottom: 24,
  },
  updated: {
    fontSize: 13,
  },
  section: {
    gap: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontWeight: '700',
  },
});
