import { StyleSheet } from 'react-native';
import { View } from '@/components/Themed';
import { PrivacyPolicyBody } from '@/components/PrivacyPolicyBody';
import { ScreenScroll } from '@/components/ScreenScroll';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenScroll>
        <PrivacyPolicyBody />
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
