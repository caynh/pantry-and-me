import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { STORAGE_LOCATIONS, type BarcodeProduct, type StorageLocation } from '@pantry-and-me/shared';
import { Text, View } from '@/components/Themed';
import { InlineError } from '@/components/InlineError';
import Colors from '@/constants/Colors';
import { toUserError } from '@/lib/user-error';
import { useColorScheme } from '@/components/useColorScheme';
import { useIngredients } from '@/hooks/useIngredients';
import { lookupBarcode } from '@/lib/api';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

// The simulator and web builds have no usable barcode camera, so those targets
// fall back to typing the number in.
const CAMERA_SUPPORTED = Platform.OS !== 'web';

interface Draft {
  barcode: string;
  name: string;
  quantity: string;
  unit: string;
  location: StorageLocation;
  expirationDate: string;
  imageUrl?: string;
  brand?: string;
  found: boolean;
}

export default function BarcodeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { addIngredient } = useIngredients();
  const [permission, requestPermission] = useCameraPermissions();

  const [manualCode, setManualCode] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A single scan fires onBarcodeScanned many times per second; this keeps only
  // the first one until the user explicitly scans again.
  const handledCode = useRef<string | null>(null);

  const runLookup = async (barcode: string) => {
    setLooking(true);
    setError(null);

    try {
      const response = await lookupBarcode({ barcode });
      const product = response.product;

      setDraft(toDraft(barcode, product));

      if (!product) {
        setError('That barcode is not in Open Food Facts yet. Add the details yourself below.');
      }
    } catch (err) {
      handledCode.current = null;
      setError(toUserError(err, 'Could not look up that barcode. Try again.'));
    } finally {
      setLooking(false);
    }
  };

  const handleScanned = ({ data }: { data: string }) => {
    if (handledCode.current || looking) return;

    handledCode.current = data;
    void runLookup(data);
  };

  const handleManualLookup = () => {
    const code = manualCode.replace(/\D/g, '');

    if (code.length < 8) {
      setError('Enter at least 8 digits from the barcode.');
      return;
    }

    handledCode.current = code;
    void runLookup(code);
  };

  const scanAnother = () => {
    handledCode.current = null;
    setDraft(null);
    setManualCode('');
    setError(null);
  };

  const save = async () => {
    if (!draft || !draft.name.trim()) {
      setError('Give the item a name before adding it.');
      return;
    }

    setSaving(true);

    try {
      const quantity = draft.quantity.trim() ? Number(draft.quantity) : undefined;

      await addIngredient({
        name: draft.name.trim(),
        quantity: Number.isFinite(quantity) ? quantity : undefined,
        unit: draft.unit.trim() || undefined,
        location: draft.location,
        source: 'barcode',
        expirationDate: draft.expirationDate.trim() || undefined,
        notes: buildNotes(draft),
      });
      router.back();
    } catch (err) {
      setError(toUserError(err, 'Could not add that item. Try again.'));
      setSaving(false);
    }
  };

  const needsPermission = CAMERA_SUPPORTED && permission != null && !permission.granted;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!draft ? (
            <>
              {CAMERA_SUPPORTED && permission?.granted ? (
                <RNView style={[styles.cameraFrame, { borderColor: colors.border }]}>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
                    onBarcodeScanned={handleScanned}
                  />
                  <RNView style={styles.reticle} pointerEvents="none">
                    <RNView style={[styles.reticleBox, { borderColor: colors.tint }]} />
                  </RNView>
                </RNView>
              ) : null}

              {needsPermission ? (
                <RNView
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.cardTitle}>Camera access</Text>
                  <Text style={{ color: colors.muted }}>
                    pantry&me needs the camera to read barcodes. You can also type the number in
                    below.
                  </Text>
                  <Pressable
                    onPress={() => void requestPermission()}
                    style={[styles.primaryButton, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.primaryText, { color: colors.background }]}>
                      Allow camera
                    </Text>
                  </Pressable>
                </RNView>
              ) : null}

              <Text style={[styles.hint, { color: colors.muted }]}>
                {CAMERA_SUPPORTED
                  ? 'Point the camera at the barcode on a packaged item, or enter the number by hand.'
                  : 'Barcode scanning needs a device camera. Enter the number by hand to try the lookup.'}
              </Text>

              <RNView style={styles.manualRow}>
                <TextInput
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="Barcode number"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  onSubmitEditing={handleManualLookup}
                  style={[
                    styles.input,
                    styles.flex,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                />
                <Pressable
                  onPress={handleManualLookup}
                  disabled={looking}
                  style={[styles.lookupButton, { backgroundColor: colors.tint }]}>
                  <Text style={[styles.primaryText, { color: colors.background }]}>Look up</Text>
                </Pressable>
              </RNView>

              {looking ? (
                <RNView style={styles.loadingRow}>
                  <ActivityIndicator color={colors.tint} />
                  <Text style={{ color: colors.muted }}>Looking up the product...</Text>
                </RNView>
              ) : null}
            </>
          ) : (
            <ProductDraftForm
              draft={draft}
              onChange={(updates) => setDraft({ ...draft, ...updates })}
              onScanAnother={scanAnother}
              onSave={() => void save()}
              saving={saving}
            />
          )}

          {error ? <InlineError message={error} /> : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function ProductDraftForm({
  draft,
  onChange,
  onScanAnother,
  onSave,
  saving,
}: {
  draft: Draft;
  onChange: (updates: Partial<Draft>) => void;
  onScanAnother: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <>
      <RNView style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <RNView style={styles.productHeader}>
          {draft.imageUrl ? (
            <Image source={{ uri: draft.imageUrl }} style={styles.thumbnail} resizeMode="contain" />
          ) : null}
          <RNView style={styles.flex}>
            <Text style={styles.cardTitle}>{draft.found ? 'Found it' : 'Not in the database'}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {draft.brand ? `${draft.brand} · ` : ''}
              {draft.barcode}
            </Text>
          </RNView>
        </RNView>
      </RNView>

      <RNView style={styles.field}>
        <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
        <TextInput
          value={draft.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Product name"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
      </RNView>

      <RNView style={styles.row}>
        <RNView style={styles.quantityField}>
          <Text style={[styles.label, { color: colors.muted }]}>Quantity</Text>
          <TextInput
            value={draft.quantity}
            onChangeText={(quantity) => onChange({ quantity })}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
        </RNView>
        <RNView style={styles.flex}>
          <Text style={[styles.label, { color: colors.muted }]}>Unit</Text>
          <TextInput
            value={draft.unit}
            onChangeText={(unit) => onChange({ unit })}
            placeholder="g, oz, count"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
        </RNView>
      </RNView>

      <RNView style={styles.field}>
        <Text style={[styles.label, { color: colors.muted }]}>Storage location</Text>
        <RNView style={styles.locationRow}>
          {STORAGE_LOCATIONS.map((option) => {
            const active = draft.location === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChange({ location: option.id })}
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
      </RNView>

      <RNView style={styles.field}>
        <Text style={[styles.label, { color: colors.muted }]}>Expiration date</Text>
        <TextInput
          value={draft.expirationDate}
          onChangeText={(expirationDate) => onChange({ expirationDate })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
      </RNView>

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={[styles.primaryButton, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}>
        <Text style={[styles.primaryText, { color: colors.background }]}>Add to ingredients</Text>
      </Pressable>

      <Pressable
        onPress={onScanAnother}
        style={[styles.secondaryButton, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Scan another</Text>
      </Pressable>
    </>
  );
}

function toDraft(barcode: string, product: BarcodeProduct | null): Draft {
  return {
    barcode,
    name: product?.name ?? '',
    quantity: product?.quantity != null ? String(product.quantity) : '',
    unit: product?.unit ?? '',
    location: product?.suggestedLocation ?? 'pantry',
    expirationDate: '',
    imageUrl: product?.imageUrl,
    brand: product?.brand,
    found: product != null,
  };
}

function buildNotes(draft: Draft): string {
  return draft.brand ? `${draft.brand} · barcode ${draft.barcode}` : `Barcode ${draft.barcode}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  cameraFrame: {
    height: 260,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  reticle: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: '70%',
    height: '45%',
    borderWidth: 2,
    borderRadius: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  lookupButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  row: {
    flexDirection: 'row',
    gap: 10,
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
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
});
