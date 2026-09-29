import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { STORAGE_LOCATIONS, type StorageLocation } from '@pantry-and-me/shared';
import { Text, View } from '@/components/Themed';
import { InlineError } from '@/components/InlineError';
import { ScreenScroll } from '@/components/ScreenScroll';
import { toUserError } from '@/lib/user-error';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useIngredients } from '@/hooks/useIngredients';
import { isValidExpirationDate } from '@/lib/expiration';

export default function AddIngredientScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { addIngredient } = useIngredients();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [location, setLocation] = useState<StorageLocation>('pantry');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Enter an ingredient name.');
      return;
    }

    if (expirationDate.trim() && !isValidExpirationDate(expirationDate.trim())) {
      setError('Enter a real date as YYYY-MM-DD, or leave that field empty.');
      return;
    }

    const parsedQuantity = quantity.trim() ? Number(quantity) : undefined;
    if (parsedQuantity !== undefined && !Number.isFinite(parsedQuantity)) {
      setError('Quantity must be a number.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addIngredient({
        name,
        quantity: parsedQuantity,
        unit: unit.trim() || undefined,
        location,
        expirationDate: expirationDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (err) {
      setError(toUserError(err, 'Could not add that ingredient. Try again.'));
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenScroll bottomExtra={32}>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Type an item in or scan a barcode to add an ingredient.
          </Text>

          <RNView style={styles.scanRow}>
            <Pressable
              onPress={() => router.push('/barcode')}
              style={[styles.scanButton, { backgroundColor: colors.card, borderColor: colors.tint }]}>
              <Text style={[styles.scanButtonText, { color: colors.tint }]}>Scan barcode</Text>
            </Pressable>
          </RNView>

          <RNView style={styles.field}>
            <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
            <TextInput
              placeholder="Ingredient name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              autoFocus
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          </RNView>

          <RNView style={styles.row}>
            <RNView style={styles.quantityField}>
              <Text style={[styles.label, { color: colors.muted }]}>Quantity</Text>
              <TextInput
                placeholder="1"
                placeholderTextColor={colors.muted}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </RNView>
            <RNView style={styles.flex}>
              <Text style={[styles.label, { color: colors.muted }]}>Unit</Text>
              <TextInput
                placeholder="cups, oz, count"
                placeholderTextColor={colors.muted}
                value={unit}
                onChangeText={setUnit}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              />
            </RNView>
          </RNView>

          <RNView style={styles.field}>
            <Text style={[styles.label, { color: colors.muted }]}>Storage location</Text>
            <RNView style={styles.locationRow}>
              {STORAGE_LOCATIONS.map((option) => {
                const active = location === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setLocation(option.id)}
                    style={[
                      styles.locationChip,
                      {
                        backgroundColor: active ? colors.tint : colors.card,
                        borderColor: active ? colors.tint : colors.border,
                      },
                    ]}>
                    <Text
                      style={{
                        color: active ? colors.background : colors.text,
                        fontWeight: '600',
                      }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </RNView>
          </RNView>

          <RNView style={styles.field}>
            <Text style={[styles.label, { color: colors.muted }]}>Expiration date</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              value={expirationDate}
              onChangeText={setExpirationDate}
              autoCapitalize="none"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          </RNView>

          <RNView style={styles.field}>
            <Text style={[styles.label, { color: colors.muted }]}>Notes</Text>
            <TextInput
              placeholder="Half used, brand, anything worth remembering"
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.notesInput,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
          </RNView>

          {error ? <InlineError message={error} style={{ marginTop: 12 }} /> : null}

          <Pressable
            disabled={submitting}
            onPress={() => void handleAdd()}
            style={[
              styles.addButton,
              { backgroundColor: colors.tint, opacity: submitting ? 0.6 : 1 },
            ]}>
            <Text style={[styles.addButtonText, { color: colors.background }]}>
              Add to ingredients
            </Text>
          </Pressable>
        </ScreenScroll>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  scanRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  scanButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  scanButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  field: {
    gap: 6,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  quantityField: {
    width: 110,
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
