import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { fz, fzText } from '@/lib/design/tokens';
import { FormSection } from '@/components/FormKit';
import { Pill } from '@/components/Pill';

interface GuestData {
  id: string;
  name: string;
  likes: string[];
  dislikes: string[];
}

interface FoodSuggestion {
  food: string;
  count: number;
}

interface SeatingPair {
  person1: string;
  person2: string;
  score: number;
  reason: string;
}

interface PartySuggestionsProps {
  guestData: GuestData[];
  foodSuggestions: {
    recommended: FoodSuggestion[];
    avoid: FoodSuggestion[];
  };
  seatingArrangement: SeatingPair[];
  initialShow?: boolean;
}

export default function PartySuggestions({
  guestData,
  foodSuggestions,
  seatingArrangement,
  initialShow = false,
}: PartySuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(initialShow);

  if (guestData.length < 2) return null;

  return (
    <FormSection>
      <TouchableOpacity onPress={() => setShowSuggestions(!showSuggestions)} activeOpacity={0.7}>
        <Text style={fzText.label}>{showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}</Text>
      </TouchableOpacity>

      {showSuggestions && (
        <View style={styles.body}>
          {/* Food Recommendations */}
          <Text style={styles.suggestionTitle}>Food Recommendations</Text>
          {foodSuggestions.recommended.length > 0 ? (
            <View style={styles.foodChips}>
              {foodSuggestions.recommended.slice(0, 8).map((item) => (
                <Pill key={item.food} label={`${item.food} (${item.count}/${guestData.length})`} />
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No common preferences found</Text>
          )}

          {/* Foods to Avoid */}
          {foodSuggestions.avoid.length > 0 && (
            <>
              <Text style={styles.suggestionTitle}>Foods to Avoid</Text>
              <View style={styles.foodChips}>
                {foodSuggestions.avoid.slice(0, 8).map((item) => (
                  <Pill key={item.food} label={`${item.food} (${item.count} dislike)`} variant="outline" />
                ))}
              </View>
            </>
          )}

          {/* Seating Suggestions */}
          <Text style={styles.suggestionTitle}>Seating Suggestions</Text>
          {seatingArrangement.length > 0 ? (
            seatingArrangement.map((pair, index) => (
              <View key={index} style={styles.seatingPair}>
                <Text style={fzText.name}>
                  {pair.person1} ↔ {pair.person2}
                </Text>
                <Text style={[fzText.sub, styles.seatingReason]}>{pair.reason}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Not enough preference data for seating suggestions</Text>
          )}

          {/* Guest Preferences */}
          <Text style={styles.suggestionTitle}>Guest Preferences</Text>
          {guestData.map((guest) => (
            <View key={guest.id} style={styles.guestPreferences}>
              <Text style={fzText.name}>{guest.name}</Text>
              {guest.likes.length > 0 && (
                <View style={styles.prefRow}>
                  <Text style={styles.prefLabel}>Likes:</Text>
                  <Text style={styles.prefItems}>{guest.likes.slice(0, 5).join(', ')}</Text>
                </View>
              )}
              {guest.dislikes.length > 0 && (
                <View style={styles.prefRow}>
                  <Text style={styles.prefLabel}>Dislikes:</Text>
                  <Text style={styles.prefItems}>{guest.dislikes.slice(0, 5).join(', ')}</Text>
                </View>
              )}
              {guest.likes.length === 0 && guest.dislikes.length === 0 && (
                <Text style={styles.noDataText}>No preferences recorded</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </FormSection>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: fz.s.md,
  },
  suggestionTitle: {
    ...fzText.label,
    marginTop: fz.s.md,
    marginBottom: fz.s.sm,
  },
  foodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  seatingPair: {
    backgroundColor: fz.surfaceSoft,
    padding: fz.s.md,
    borderRadius: fz.rCard,
    marginBottom: fz.s.sm,
  },
  seatingReason: {
    marginTop: 4,
  },
  guestPreferences: {
    backgroundColor: fz.surfaceSoft,
    padding: fz.s.md,
    borderRadius: fz.rCard,
    marginBottom: fz.s.sm,
  },
  prefRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  prefLabel: {
    ...fzText.sub,
    fontWeight: '600',
    marginRight: 8,
  },
  prefItems: {
    ...fzText.body,
    flex: 1,
  },
  noDataText: {
    ...fzText.sub,
    fontStyle: 'italic',
  },
});
