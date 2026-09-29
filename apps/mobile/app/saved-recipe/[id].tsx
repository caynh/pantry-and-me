import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { InlineError } from '@/components/InlineError';
import { ScreenScroll } from '@/components/ScreenScroll';
import { toUserError } from '@/lib/user-error';
import { StarRating } from '@/components/StarRating';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';

export default function SavedRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, updateNotes, remove } = useSavedRecipes();
  const recipe = getById(id);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(recipe?.notes ?? '');
  }, [recipe?.id, recipe?.notes]);

  if (!recipe) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Saved recipe' }} />
        <Text style={{ color: colors.muted }}>This recipe is no longer in My Recipes.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.tint, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const openInApp = () => {
    if (Platform.OS === 'web') {
      void WebBrowser.openBrowserAsync(recipe.url);
      return;
    }

    router.push({
      pathname: '/recipe',
      params: { url: recipe.url, title: recipe.title },
    });
  };

  const saveNotes = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateNotes(recipe.id, notes);
    } catch (err) {
      setError(toUserError(err, 'Could not save those notes. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    Alert.alert('Remove recipe', `Remove “${recipe.title}” from My Recipes?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await remove(recipe.id);
            router.back();
          })();
        },
      },
    ]);
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: recipe.title }} />
      <ScreenScroll bottomExtra={32}>
        <Text style={styles.title}>{recipe.title}</Text>

        <RNView style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>Reviews</Text>
          <StarRating rating={recipe.rating} reviewCount={recipe.reviewCount} size="md" />
          <Text style={[styles.reviewCopy, { color: colors.muted }]}>
            {typeof recipe.rating === 'number'
              ? typeof recipe.reviewCount === 'number'
                ? `Rated ${recipe.rating.toFixed(1)} out of 5 from ${recipe.reviewCount.toLocaleString()} reviews.`
                : `Rated ${recipe.rating.toFixed(1)} out of 5.`
              : 'No public rating was available for this recipe when you saved it.'}
          </Text>
        </RNView>

        <RNView style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>Description</Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {recipe.snippet || 'No description was saved for this recipe.'}
          </Text>
        </RNView>

        <RNView style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>Your notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Timing tweaks, substitutions, what to try next time…"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={[
              styles.notesInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
            ]}
          />
          <Pressable
            onPress={() => void saveNotes()}
            disabled={saving}
            style={[
              styles.secondaryButton,
              { borderColor: colors.tint, opacity: saving ? 0.6 : 1 },
            ]}>
            <Text style={{ color: colors.tint, fontWeight: '700' }}>
              {saving ? 'Saving…' : 'Save notes'}
            </Text>
          </Pressable>
        </RNView>

        {error ? <InlineError message={error} style={{ marginTop: 16 }} /> : null}

        <Pressable
          onPress={openInApp}
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}>
          <Text style={[styles.primaryText, { color: colors.background }]}>Open recipe</Text>
        </Pressable>

        <Pressable
          onPress={handleRemove}
          style={[styles.secondaryButton, { borderColor: colors.danger }]}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Remove from My Recipes</Text>
        </Pressable>
      </ScreenScroll>
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  section: {
    gap: 8,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewCopy: {
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 120,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
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
    marginTop: 10,
  },
});
