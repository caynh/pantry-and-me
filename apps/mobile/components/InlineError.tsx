import { StyleSheet, View as RNView, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface InlineErrorProps {
  message: string;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

export function InlineError({ message, align = 'left', style }: InlineErrorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <RNView
      accessibilityRole="alert"
      style={[
        styles.box,
        {
          borderColor: colors.danger,
          backgroundColor: colorScheme === 'dark' ? 'rgba(248, 113, 113, 0.12)' : 'rgba(220, 38, 38, 0.08)',
        },
        style,
      ]}>
      <Text style={[styles.text, { color: colors.danger, textAlign: align }]}>{message}</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
