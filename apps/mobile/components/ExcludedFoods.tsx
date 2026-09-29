import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface ExcludedFoodsProps {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}

export default function ExcludedFoods({ items, onAdd, onRemove }: ExcludedFoodsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [draft, setDraft] = useState('');

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft('');
  };

  return (
    <RNView style={styles.container}>
      <Text style={styles.label}>Exclude foods</Text>

      {items.length > 0 ? (
        <RNView style={styles.row}>
          {items.map((item) => (
            <Pressable
              key={item}
              onPress={() => onRemove(item)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item}`}
              style={[
                styles.chip,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}>
              <Text style={[styles.chipText, { color: colors.text }]}>{item}</Text>
              <Text style={[styles.chipDismiss, { color: colors.muted }]}>×</Text>
            </Pressable>
          ))}
        </RNView>
      ) : null}

      <RNView style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Type a food, then add"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
          ]}
        />
        <Pressable
          onPress={submit}
          disabled={!draft.trim()}
          style={[
            styles.addButton,
            {
              backgroundColor: colors.tint,
              opacity: draft.trim() ? 1 : 0.45,
            },
          ]}>
          <Text style={[styles.addText, { color: colors.background }]}>Add</Text>
        </Pressable>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipDismiss: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  addText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
