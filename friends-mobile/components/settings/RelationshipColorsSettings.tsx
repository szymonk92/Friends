import { relationshipTypeLabel } from '@/lib/i18n/labels';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, List, Button } from 'react-native-paper';
import { DEFAULT_COLORS } from '@/lib/settings/relationship-colors';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('relColors.title')}
        </Text>
        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.description}>
          {t('relColors.description')}
        </Text>

        {Object.keys(DEFAULT_COLORS).map((type) => (
          <List.Item
            key={type}
            title={relationshipTypeLabel(type)}
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
                {t('relColors.change')}
              </Button>
            )}
          />
        ))}

        <Button mode="outlined" onPress={handleResetColors} icon="refresh" style={styles.button}>
          {t('relColors.reset')}
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
