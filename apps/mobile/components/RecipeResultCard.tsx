import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View as RNView } from 'react-native';
import type { RecipeSearchResult } from '@pantry-and-me/shared';
import { Text } from '@/components/Themed';
import { StarRating } from '@/components/StarRating';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';

interface RecipeResultCardProps {
  result: RecipeSearchResult;
}

export default function RecipeResultCard({ result }: RecipeResultCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { isSaved, toggleSave } = useSavedRecipes();
  const saved = isSaved(result.url);

  const openRecipe = () => {
    // Recipe sites block iframes, which is all a WebView can be on web, so the
    // browser build hands off to a new tab instead.
    if (Platform.OS === 'web') {
      void WebBrowser.openBrowserAsync(result.url);
      return;
    }

    router.push({
      pathname: '/recipe',
      params: { url: result.url, title: result.title },
    });
  };

  return (
    <Pressable
      onPress={openRecipe}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <RNView style={styles.header}>
        <Text style={[styles.title, styles.titleFlex]}>{result.title}</Text>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from My Recipes' : 'Save to My Recipes'}
          onPress={() => {
            void toggleSave(result);
          }}
          style={styles.heartButton}>
          <Text style={{ fontSize: 22, color: saved ? colors.danger : colors.border }}>
            {saved ? '♥' : '♡'}
          </Text>
        </Pressable>
      </RNView>

      <StarRating rating={result.rating} reviewCount={result.reviewCount} />

      <Text style={[styles.snippet, { color: colors.muted }]} numberOfLines={3}>
        {result.snippet}
      </Text>
      {result.matchedIngredients.length > 0 ? (
        <Text style={[styles.match, { color: colors.tint }]}>
          Matches: {result.matchedIngredients.join(', ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
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
  heartButton: {
    paddingTop: 0,
    paddingHorizontal: 2,
  },
  snippet: {
    fontSize: 14,
    lineHeight: 20,
  },
  match: {
    fontSize: 12,
    fontWeight: '600',
  },
});
