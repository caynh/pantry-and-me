import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import type { ScannedIngredient, StorageLocation } from '@pantry-and-me/shared';
import { STORAGE_LOCATIONS } from '@pantry-and-me/shared';
import { Text, View } from '@/components/Themed';
import { InlineError } from '@/components/InlineError';
import Colors from '@/constants/Colors';
import { toUserError } from '@/lib/user-error';
import { useColorScheme } from '@/components/useColorScheme';
import { useIngredients } from '@/hooks/useIngredients';
import { scanIngredientPhoto } from '@/lib/api';

interface ReviewItem extends ScannedIngredient {
  selected: boolean;
}

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { addIngredients } = useIngredients();

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [location, setLocation] = useState<StorageLocation>('fridge');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      setError('That photo could not be read. Try again.');
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const response = await scanIngredientPhoto({
        imageBase64: asset.base64,
        mimeType: 'image/jpeg',
      });

      if (response.items.length === 0) {
        setError('No food items were detected. Try a closer photo with better lighting.');
      }

      setItems(response.items.map((item) => ({ ...item, selected: true })));
    } catch (err) {
      setError(toUserError(err, 'Scan did not finish. Try another photo.'));
      setItems([]);
    } finally {
      setScanning(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to scan items.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled) return;

    setPreviewUri(result.assets[0].uri);
    await runScan(result.assets[0]);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled) return;

    setPreviewUri(result.assets[0].uri);
    await runScan(result.assets[0]);
  };

  const updateItem = (index: number, updates: Partial<ReviewItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)),
    );
  };

  const saveSelected = async () => {
    const selected = items.filter((item) => item.selected && item.name.trim());

    if (selected.length === 0) {
      setError('Select at least one item to add.');
      return;
    }

    setSaving(true);

    try {
      await addIngredients(
        selected.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location,
          source: 'scan',
          expirationDate: item.expirationDate,
        })),
      );
      router.back();
    } catch (err) {
      setError(toUserError(err, 'Could not save those items. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.subheading, { color: colors.muted }]}>
        Take a photo of your fridge shelf, pantry, or a product label. Review what we found before
        adding it.
      </Text>

      <RNView style={styles.actions}>
        <Pressable
          onPress={() => void takePhoto()}
          disabled={scanning}
          style={[styles.actionButton, { backgroundColor: colors.tint }]}>
          <Text style={[styles.actionText, { color: colors.background }]}>Take photo</Text>
        </Pressable>
        <Pressable
          onPress={() => void pickPhoto()}
          disabled={scanning}
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.actionText, { color: colors.text }]}>Choose photo</Text>
        </Pressable>
      </RNView>

      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
      ) : null}

      {scanning ? (
        <RNView style={styles.scanning}>
          <ActivityIndicator color={colors.tint} />
          <Text style={{ color: colors.muted }}>Looking for ingredients...</Text>
        </RNView>
      ) : null}

      {error ? <InlineError message={error} /> : null}

      {items.length > 0 ? (
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
                <Text style={{ color: active ? colors.background : colors.text, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </RNView>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <RNView style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <RNView style={styles.itemHeader}>
              <Pressable
                onPress={() => updateItem(index, { selected: !item.selected })}
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: item.selected ? colors.tint : 'transparent',
                    borderColor: item.selected ? colors.tint : colors.border,
                  },
                ]}>
                {item.selected ? (
                  <Text style={[styles.checkmark, { color: colors.background }]}>✓</Text>
                ) : null}
              </Pressable>
              <TextInput
                value={item.name}
                onChangeText={(value) => updateItem(index, { name: value })}
                style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
              />
            </RNView>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {Math.round(item.confidence * 100)}% confident
              {item.quantity != null ? ` · ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
              {item.expirationDate ? ` · expires ${item.expirationDate}` : ''}
            </Text>
          </RNView>
        )}
      />

      {items.length > 0 ? (
        <Pressable
          onPress={() => void saveSelected()}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}>
          <Text style={[styles.actionText, { color: colors.background }]}>
            Add {selectedCount} item{selectedCount === 1 ? '' : 's'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionText: {
    fontWeight: '700',
    fontSize: 15,
  },
  preview: {
    height: 140,
    borderRadius: 12,
  },
  scanning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  listContent: {
    gap: 10,
    paddingBottom: 12,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
