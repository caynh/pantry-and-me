import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface StarRatingProps {
  rating?: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
}

/** Renders up to five stars. Empty outline when no rating is available. */
export function StarRating({ rating, reviewCount, size = 'sm' }: StarRatingProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const starSize = size === 'md' ? 18 : 14;
  const hasRating = typeof rating === 'number' && Number.isFinite(rating);

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = hasRating ? starFill(rating, star) : 'empty';
          return (
            <Text
              key={star}
              style={{
                fontSize: starSize,
                color: fill === 'empty' ? colors.border : colors.accent,
                lineHeight: starSize + 2,
              }}>
              {fill === 'empty' ? '☆' : '★'}
            </Text>
          );
        })}
      </View>
      {hasRating ? (
        <Text style={[styles.meta, { color: colors.muted, fontSize: size === 'md' ? 14 : 12 }]}>
          {rating!.toFixed(1)}
          {typeof reviewCount === 'number' ? ` (${formatCount(reviewCount)})` : ''}
        </Text>
      ) : (
        <Text style={[styles.meta, { color: colors.muted, fontSize: size === 'md' ? 14 : 12 }]}>
          No rating
        </Text>
      )}
    </View>
  );
}

function starFill(rating: number, star: number): 'full' | 'empty' {
  // Half-stars render as full once the rating clears the halfway mark for that slot.
  return rating + 0.25 >= star ? 'full' : 'empty';
}

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  meta: {
    fontWeight: '500',
  },
});
