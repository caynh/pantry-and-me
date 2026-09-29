import type { ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenScrollProps extends Omit<ScrollViewProps, 'contentContainerStyle'> {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra space above the tab bar so the last item is reachable. */
  bottomExtra?: number;
}

/**
 * Full-screen vertical scroller for shorter screens (Settings, forms).
 * Prefer FlatList for long ingredient/recipe lists.
 */
export function ScreenScroll({
  children,
  contentContainerStyle,
  bottomExtra = 24,
  style,
  ...rest
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.fill, style]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 12) + bottomExtra },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      nestedScrollEnabled
      alwaysBounceVertical
      showsVerticalScrollIndicator
      scrollEventThrottle={16}
      {...rest}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
