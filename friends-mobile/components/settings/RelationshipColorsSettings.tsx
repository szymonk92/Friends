import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, List, Button } from 'react-native-paper';
import { DEFAULT_COLORS } from '@/lib/settings/relationship-colors';

interface RelationshipColorsSettingsProps {
  relationshipColors: Record<string, string>;
  setSelectedRelationType: (type: string) => void;
  setColorPickerVisible: (visible: boolean) => void;
  handleResetColors: () => void;
}

export default function RelationshipColorsSettings({
  relationshipColors,
  setSelectedRelationType,
  setColorPickerVisible,
  handleResetColors,
}: RelationshipColorsSettingsProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Relationship Colors
        </Text>
        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.description}>
          Customize colors for different relationship types to easily identify them in the app.
        </Text>

        {Object.keys(DEFAULT_COLORS).map((type) => (
          <List.Item
            key={type}
            title={type.charAt(0).toUpperCase() + type.slice(1)}
            left={() => (
              <View style={[styles.colorSwatch, { backgroundColor: relationshipColors[type] }]} />
            )}
            right={() => (
              <Button
                compact
                mode="text"
                onPress={() => {
                  setSelectedRelationType(type);
                  setColorPickerVisible(true);
                }}
              >
                Change
              </Button>
            )}
          />
        ))}

        <Button mode="outlined" onPress={handleResetColors} icon="refresh" style={styles.button}>
          Reset to Defaults
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
    opacity: 0.7,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    marginTop: 16,
  },
});
