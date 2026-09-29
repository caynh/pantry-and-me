import type { ReactNode } from 'react';
import { Modal, StyleSheet, View as RNView } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Placement = 'center' | 'top' | 'bottom';

interface DimmedModalProps {
  visible: boolean;
  children: ReactNode;
  placement?: Placement;
  onRequestClose?: () => void;
}

/**
 * Centered (or anchored) card over a slightly darkened backdrop so the
 * rest of the app stays visible but the prompt stands out.
 */
export function DimmedModal({
  visible,
  children,
  placement = 'center',
  onRequestClose,
}: DimmedModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onRequestClose}>
      <RNView
        style={[
          styles.backdrop,
          placement === 'top' && styles.backdropTop,
          placement === 'bottom' && styles.backdropBottom,
        ]}
        accessibilityViewIsModal>
        <RNView
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: '#000',
            },
          ]}>
          {children}
        </RNView>
      </RNView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  backdropTop: {
    justifyContent: 'flex-start',
    paddingTop: 72,
  },
  backdropBottom: {
    justifyContent: 'flex-end',
    paddingBottom: 96,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 12,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
