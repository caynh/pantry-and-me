import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RecipeSearchResult } from '@pantry-and-me/shared';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import DietaryToggles from '@/components/DietaryToggles';
import ExcludedFoods from '@/components/ExcludedFoods';
import { InlineError } from '@/components/InlineError';
import RecipeResultCard from '@/components/RecipeResultCard';
import { searchRecipes } from '@/lib/api';
import { toUserError } from '@/lib/user-error';
import { useIngredients } from '@/hooks/useIngredients';
import { usePreferences } from '@/hooks/usePreferences';

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { ingredients } = useIngredients();
  const { preferences, toggleDietary, addExcludedIngredient, removeExcludedIngredient } =
    usePreferences();

  const [results, setResults] = useState<RecipeSearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (ingredients.length === 0) {
      setError('Add ingredients first, then search for matching recipes.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchRecipes({
        ingredients: ingredients.map((item) => item.name),
        dietary: preferences.dietaryRestrictions,
        excluded: preferences.excludedIngredients,
      });
      setQuery(response.query);
      setResults(response.results);
    } catch (err) {
      setError(toUserError(err, 'Recipe search did not finish. Try again in a moment.'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.fill}
        data={results}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 24,
        }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        ListHeaderComponent={
          <RNView>
            <Text style={styles.heading}>Recipe search</Text>
            <Text style={[styles.subheading, { color: colors.muted, marginBottom: 12 }]}>
              Finds recipe articles online that match your current ingredients list.
            </Text>

            <DietaryToggles
              selected={preferences.dietaryRestrictions}
              onToggle={(restriction) => void toggleDietary(restriction)}
            />

            <ExcludedFoods
              items={preferences.excludedIngredients}
              onAdd={(value) => void addExcludedIngredient(value)}
              onRemove={(value) => void removeExcludedIngredient(value)}
            />

            <Pressable
              onPress={() => void handleSearch()}
              disabled={loading}
              style={[
                styles.searchButton,
                { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1, marginTop: 12 },
              ]}>
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.searchButtonText, { color: colors.background }]}>
                  Search with {ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'}
                </Text>
              )}
            </Pressable>

            {query ? (
              <Text style={[styles.query, { color: colors.muted, marginTop: 10 }]} numberOfLines={2}>
                Query: {query}
              </Text>
            ) : null}

            {error ? <InlineError message={error} style={{ marginTop: 10 }} /> : null}

            {!loading && results.length === 0 && !error ? (
              <RNView style={styles.emptyBox}>
                <Text style={{ color: colors.muted, textAlign: 'center' }}>
                  {query
                    ? 'No recipes matched your ingredients and filters.'
                    : 'Run a search to see recipe article links.'}
                </Text>
              </RNView>
            ) : null}
          </RNView>
        }
        renderItem={({ item }) => (
          <RNView style={styles.resultWrap}>
            <RecipeResultCard result={item} />
          </RNView>
        )}
      />
    </View>
  );
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
    paddingBottom: 8,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: 4,
  },
  searchButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  query: {
    fontSize: 12,
  },
  emptyBox: {
    marginTop: 24,
  },
  resultWrap: {
    marginTop: 10,
  },
});
