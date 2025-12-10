import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';

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
    <Card style={styles.card}>
      <Card.Content>
        <Button
          mode="text"
          onPress={() => setShowSuggestions(!showSuggestions)}
          icon={showSuggestions ? 'chevron-up' : 'chevron-down'}
        >
          {showSuggestions ? 'Hide' : 'Show'} Suggestions
        </Button>

        {showSuggestions && (
          <>
            {/* Food Recommendations */}
            <Text variant="titleMedium" style={styles.suggestionTitle}>
              🍽️ Food Recommendations
            </Text>
            {foodSuggestions.recommended.length > 0 ? (
              <View style={styles.foodChips}>
                {foodSuggestions.recommended.slice(0, 8).map((item) => (
                  <Chip key={item.food} icon="thumb-up" style={styles.recommendChip}>
                    {item.food} ({item.count}/{guestData.length})
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.noDataText}>No common preferences found</Text>
            )}

            {/* Foods to Avoid */}
            {foodSuggestions.avoid.length > 0 && (
              <>
                <Text variant="titleMedium" style={styles.suggestionTitle}>
                  ⚠️ Foods to Avoid
                </Text>
                <View style={styles.foodChips}>
                  {foodSuggestions.avoid.slice(0, 8).map((item) => (
                    <Chip key={item.food} icon="alert" style={styles.avoidChip}>
                      {item.food} ({item.count} dislike)
                    </Chip>
                  ))}
                </View>
              </>
            )}

            {/* Seating Suggestions */}
            <Text variant="titleMedium" style={styles.suggestionTitle}>
              🪑 Seating Suggestions
            </Text>
            {seatingArrangement.length > 0 ? (
              seatingArrangement.map((pair, index) => (
                <View key={index} style={styles.seatingPair}>
                  <Text variant="bodyLarge">
                    {pair.person1} ↔️ {pair.person2}
                  </Text>
                  <Text variant="bodySmall" style={styles.seatingReason}>
                    {pair.reason}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>
                Not enough preference data for seating suggestions
              </Text>
            )}

            {/* Guest Preferences */}
            <Text variant="titleMedium" style={styles.suggestionTitle}>
              👥 Guest Preferences
            </Text>
            {guestData.map((guest) => (
              <View key={guest.id} style={styles.guestPreferences}>
                <Text variant="titleSmall">{guest.name}</Text>
                {guest.likes.length > 0 && (
                  <View style={styles.prefRow}>
                    <Text style={styles.prefLabel}>Likes:</Text>
                    <Text style={styles.prefItems}>{guest.likes.slice(0, 5).join(', ')}</Text>
                  </View>
                )}
                {guest.dislikes.length > 0 && (
                  <View style={styles.prefRow}>
                    <Text style={styles.prefLabel}>Dislikes:</Text>
                    <Text style={styles.prefItemsRed}>{guest.dislikes.slice(0, 5).join(', ')}</Text>
                  </View>
                )}
                {guest.likes.length === 0 && guest.dislikes.length === 0 && (
                  <Text style={styles.noDataText}>No preferences recorded</Text>
                )}
              </View>
            ))}
          </>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
  },
  suggestionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  foodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recommendChip: {
    backgroundColor: '#c8e6c9',
    marginBottom: 4,
  },
  avoidChip: {
    backgroundColor: '#ffcdd2',
    marginBottom: 4,
  },
  seatingPair: {
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  seatingReason: {
    opacity: 0.7,
    marginTop: 4,
  },
  guestPreferences: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  prefRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  prefLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    opacity: 0.8,
  },
  prefItems: {
    flex: 1,
    color: '#2e7d32',
  },
  prefItemsRed: {
    flex: 1,
    color: '#c62828',
  },
  noDataText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
