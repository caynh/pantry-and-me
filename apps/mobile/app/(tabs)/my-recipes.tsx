import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View as RNView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { StarRating } from '@/components/StarRating';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';

export default function MyRecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recipes, loading, remove } = useSavedRecipes();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.fill}
        data={recipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 24,
        }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        ListHeaderComponent={
          <RNView>
            <Text style={styles.heading}>My Recipes</Text>
            <Text style={[styles.subheading, { color: colors.muted }]}>
              Recipes you heart from search stay here for later.
            </Text>

            {!loading && recipes.length === 0 ? (
              <Text style={[styles.empty, { color: colors.muted }]}>
                No saved recipes yet. Search on the Recipes tab and tap the heart on anything you want
                to keep.
              </Text>
            ) : null}

            {recipes.length > 0 ? (
              <Text style={[styles.count, { color: colors.muted }]}>
                {recipes.length} saved · tap to open
              </Text>
            ) : null}
          </RNView>
        }
        renderItem={({ item: recipe }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/saved-recipe/[id]',
                params: { id: recipe.id },
              })
            }
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <RNView style={styles.header}>
              <Text style={[styles.title, styles.titleFlex]}>{recipe.title}</Text>
              <Pressable
                hitSlop={10}
                onPress={() => void remove(recipe.id)}
                accessibilityLabel="Remove from My Recipes">
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove</Text>
              </Pressable>
            </RNView>

            <StarRating rating={recipe.rating} reviewCount={recipe.reviewCount} />

            <Text style={[styles.snippet, { color: colors.muted }]} numberOfLines={2}>
              {recipe.snippet}
            </Text>

            {recipe.notes ? (
              <Text style={[styles.notesPreview, { color: colors.muted }]} numberOfLines={1}>
                Notes: {recipe.notes}
              </Text>
            ) : null}
          </Pressable>
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
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    paddingTop: 8,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  titleFlex: {
    flex: 1,
  },
  snippet: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesPreview: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
