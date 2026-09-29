import { Pressable, StyleSheet } from 'react-native';
import { DIETARY_OPTIONS, type DietaryRestriction } from '@pantry-and-me/shared';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface DietaryTogglesProps {
  selected: DietaryRestriction[];
  onToggle: (restriction: DietaryRestriction) => void;
}

export default function DietaryToggles({ selected, onToggle }: DietaryTogglesProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Dietary filters</Text>
      <View style={styles.row}>
        {DIETARY_OPTIONS.map((option) => {
          const active = selected.includes(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onToggle(option.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.tint : colors.card,
                  borderColor: active ? colors.tint : colors.border,
                },
              ]}>
              <Text style={[styles.chipText, { color: active ? colors.background : colors.text }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
