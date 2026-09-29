import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { STORAGE_LOCATIONS, type Ingredient, type StorageLocation } from '@pantry-and-me/shared';
import { Text, View } from '@/components/Themed';
import { InlineError } from '@/components/InlineError';
import Colors from '@/constants/Colors';
import { toUserError } from '@/lib/user-error';
import { useColorScheme } from '@/components/useColorScheme';
import { useIngredients } from '@/hooks/useIngredients';
import { isValidExpirationDate } from '@/lib/expiration';

export default function EditIngredientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ingredients } = useIngredients();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const ingredient = ingredients.find((item) => item.id === id);

  if (!ingredient) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Edit ingredient' }} />
        <Text style={{ color: colors.muted }}>This ingredient is no longer in your list.</Text>
      </View>
    );
  }

  // Keying by id resets the form state if a different ingredient is opened.
  return <EditIngredientForm key={ingredient.id} ingredient={ingredient} />;
}

function EditIngredientForm({ ingredient }: { ingredient: Ingredient }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { updateIngredient, removeIngredient } = useIngredients();

  const [name, setName] = useState(ingredient.name);
  const [quantity, setQuantity] = useState(
    ingredient.quantity != null ? String(ingredient.quantity) : '',
  );
  const [unit, setUnit] = useState(ingredient.unit ?? '');
  const [location, setLocation] = useState<StorageLocation>(ingredient.location);
  const [expirationDate, setExpirationDate] = useState(ingredient.expirationDate ?? '');
  const [notes, setNotes] = useState(ingredient.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('An ingredient needs a name.');
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

    setSaving(true);
    setError(null);

    try {
      await updateIngredient(ingredient.id, {
        name: name.trim(),
        quantity: parsedQuantity,
        unit: unit.trim() || undefined,
        location,
        expirationDate: expirationDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (err) {
      setError(toUserError(err, 'Could not save those changes. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Remove ingredient', `Remove ${ingredient.name} from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeIngredient(ingredient.id);
              router.back();
            } catch (err) {
              setError(toUserError(err, 'Could not remove that ingredient. Try again.'));
            }
          })();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: ingredient.name }} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ingredient name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          </Field>

          <RNView style={styles.row}>
            <RNView style={styles.quantityField}>
              <Field label="Quantity">
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
              </Field>
            </RNView>
            <RNView style={styles.flex}>
              <Field label="Unit">
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="cups, oz, count"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
              </Field>
            </RNView>
          </RNView>

          <Field label="Storage location">
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
                      style={{ color: active ? colors.background : colors.text, fontWeight: '600' }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </RNView>
          </Field>

          <Field label="Expiration date">
            <TextInput
              value={expirationDate}
              onChangeText={setExpirationDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          </Field>

          <Field label="Notes">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Half used, opened last week, brand, etc."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.notesInput,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
          </Field>

          <Text style={[styles.meta, { color: colors.muted }]}>
            Added {new Date(ingredient.createdAt).toLocaleDateString()}
          </Text>

          {error ? <InlineError message={error} /> : null}

          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}>
            <Text style={[styles.saveText, { color: colors.background }]}>Save changes</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.danger }]}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Remove from list</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <RNView style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      {children}
    </RNView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  field: {
    gap: 6,
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
    minHeight: 96,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  quantityField: {
    width: 110,
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
  meta: {
    fontSize: 12,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    fontWeight: '700',
    fontSize: 15,
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
});
