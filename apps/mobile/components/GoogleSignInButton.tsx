import { Pressable, StyleSheet, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onPress: () => void;
}

export function GoogleSignInButton({ disabled, onPress }: GoogleSignInButtonProps) {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      style={[
        styles.button,
        {
          backgroundColor: dark ? '#131314' : '#FFFFFF',
          borderColor: dark ? '#8E918F' : '#747775',
          opacity: disabled ? 0.6 : 1,
        },
      ]}>
      <RNView style={styles.logo}>
        <Text style={styles.logoG}>G</Text>
      </RNView>
      <Text style={[styles.label, { color: dark ? '#E3E3E3' : '#1F1F1F' }]}>
        Sign in with Google
      </Text>
      <RNView style={styles.logo} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 20,
    alignItems: 'center',
  },
  logoG: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
});
