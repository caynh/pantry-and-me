import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STORAGE_LOCATIONS, type Ingredient, type StorageLocation } from '@pantry-and-me/shared';
import { Text, View } from '@/components/Themed';
import { InlineError } from '@/components/InlineError';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useIngredients } from '@/hooks/useIngredients';
import { usePreferences } from '@/hooks/usePreferences';
import {
  formatExpirationLabel,
  getExpirationUrgency,
  getExpiringSoonIngredients,
  type ExpirationUrgency,
} from '@/lib/expiration';

type LocationFilter = 'all' | StorageLocation;

export default function IngredientsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ingredients, loading, error, removeIngredient, isCloudSync } = useIngredients();
  const { preferences } = usePreferences();

  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');

  const leadDays = preferences.expirationLeadDays;
  const expiringSoon = useMemo(
    () => getExpiringSoonIngredients(ingredients, leadDays),
    [ingredients, leadDays],
  );
  const expiringIds = useMemo(() => new Set(expiringSoon.map((item) => item.id)), [expiringSoon]);

  const filtered = useMemo(
    () => filterIngredients(ingredients, query, locationFilter),
    [ingredients, locationFilter, query],
  );

  /** Main list excludes items already shown in Expiring soon (unless searching/filtering). */
  const listItems = useMemo(() => {
    const searching = Boolean(query.trim()) || locationFilter !== 'all';
    if (searching) return filtered;
    return filtered.filter((item) => !expiringIds.has(item.id));
  }, [expiringIds, filtered, locationFilter, query]);

  const fabBottom = Math.max(insets.bottom, 8) + 16;
  const searching = Boolean(query.trim()) || locationFilter !== 'all';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.fill}
        data={listItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 88,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        ListHeaderComponent={
          <RNView>
            <Text style={styles.heading}>Your ingredients</Text>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search ingredients"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={[
                styles.searchInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
              ]}
            />

            <RNView style={styles.filterRow}>
              <FilterChip
                label="All"
                active={locationFilter === 'all'}
                onPress={() => setLocationFilter('all')}
              />
              {STORAGE_LOCATIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  active={locationFilter === option.id}
                  onPress={() => setLocationFilter(option.id)}
                />
              ))}
            </RNView>

            {error ? <InlineError message={error} style={{ marginTop: 8 }} /> : null}

            {loading && ingredients.length === 0 ? (
              <RNView style={styles.loadingRow}>
                <ActivityIndicator color={colors.tint} />
                <Text style={{ color: colors.muted }}>Loading ingredients...</Text>
              </RNView>
            ) : null}

            {!loading && ingredients.length === 0 ? (
              <Text style={[styles.empty, { color: colors.muted }]}>
                No ingredients yet. Tap + to add one, or scan a photo or barcode.
              </Text>
            ) : null}

            {!loading && ingredients.length > 0 && filtered.length === 0 ? (
              <Text style={[styles.empty, { color: colors.muted }]}>
                No ingredients match your search.
              </Text>
            ) : null}

            {!searching && expiringSoon.length > 0 ? (
              <RNView style={styles.expiringBlock}>
                <Text style={[styles.sectionLabel, { color: colors.warning }]}>
                  Expiring soon · {expiringSoon.length}
                </Text>
                {expiringSoon.map((item) => (
                  <IngredientRow
                    key={item.id}
                    item={item}
                    leadDays={leadDays}
                    onPress={() => router.push(`/ingredient/${item.id}`)}
                    onRemove={() => void removeIngredient(item.id)}
                  />
                ))}
              </RNView>
            ) : null}

            {listItems.length > 0 ? (
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                {searching
                  ? `${listItems.length} item${listItems.length === 1 ? '' : 's'} shown · tap to edit`
                  : expiringSoon.length > 0
                    ? `Everything else · tap to edit`
                    : `${listItems.length} item${listItems.length === 1 ? '' : 's'} · tap to edit`}
              </Text>
            ) : null}
          </RNView>
        }
        renderItem={({ item }) => (
          <IngredientRow
            item={item}
            leadDays={leadDays}
            onPress={() => router.push(`/ingredient/${item.id}`)}
            onRemove={() => void removeIngredient(item.id)}
          />
        )}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add ingredient"
        onPress={() => router.push('/add-ingredient')}
        style={[
          styles.fab,
          {
            backgroundColor: colors.tint,
            bottom: fabBottom,
            shadowColor: '#000',
          },
        ]}>
        <Text style={[styles.fabText, { color: colors.background }]}>+</Text>
      </Pressable>
    </View>
  );
}

function IngredientRow({
  item,
  leadDays,
  onPress,
  onRemove,
}: {
  item: Ingredient;
  leadDays: 1 | 3 | 7;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const urgency = getExpirationUrgency(item.expirationDate, leadDays);
  const dateColor = urgencyColor(urgency, colors);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <RNView style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Out of this</Text>
        </Pressable>
      </RNView>
      <Text style={{ color: colors.muted }}>
        {item.location}
        {item.quantity != null ? ` · ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
      </Text>
      {item.expirationDate ? (
        <Text style={{ color: dateColor, fontWeight: urgency === 'ok' || urgency === 'none' ? '400' : '600' }}>
          {formatExpirationLabel(item.expirationDate, urgency)}
        </Text>
      ) : null}
      {item.notes ? (
        <Text style={{ color: colors.muted, fontStyle: 'italic' }} numberOfLines={1}>
          {item.notes}
        </Text>
      ) : null}
    </Pressable>
  );
}

function urgencyColor(
  urgency: ExpirationUrgency,
  colors: (typeof Colors)['light'],
): string {
  switch (urgency) {
    case 'expired':
      return colors.danger;
    case 'soon':
      return colors.warning;
    default:
      return colors.muted;
  }
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? colors.tint : colors.card,
          borderColor: active ? colors.tint : colors.border,
        },
      ]}>
      <Text style={{ color: active ? colors.background : colors.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function filterIngredients(
  ingredients: Ingredient[],
  query: string,
  locationFilter: LocationFilter,
): Ingredient[] {
  const needle = query.trim().toLowerCase();

  return ingredients.filter((item) => {
    if (locationFilter !== 'all' && item.location !== locationFilter) return false;
    if (!needle) return true;

    const haystack = `${item.name} ${item.notes ?? ''} ${item.unit ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    paddingBottom: 16,
  },
  subheading: {
    fontSize: 13,
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
    paddingTop: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  expiringBlock: {
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: {
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 34,
    marginTop: -2,
  },
});
