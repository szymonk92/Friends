import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, Button } from 'react-native-paper';
import {
  AVAILABLE_FONTS,
  type FontFamily,
} from '@/store/useSettings';
import { useTranslation } from 'react-i18next';

interface AppearanceSettingsProps {
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
}

export default function AppearanceSettings({
  fontFamily,
  setFontFamily,
}: AppearanceSettingsProps) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('settings.appearance')}
        </Text>
        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.description}>
          {t('settings.appearanceDescription')}
        </Text>

        <Text variant="labelMedium" style={styles.themeLabel}>
          {t('settings.fontFamily')}
        </Text>
        <View style={styles.themeGrid}>
          {(Object.keys(AVAILABLE_FONTS) as FontFamily[]).map((font) => (
            <Button
              key={font}
              mode={fontFamily === font ? 'contained' : 'outlined'}
              onPress={() => setFontFamily(font)}
              style={styles.themeButton}
              labelStyle={styles.themeButtonLabel}
              contentStyle={styles.themeButtonContent}
              compact
            >
              {font}
            </Button>
          ))}
        </View>
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
  themeLabel: {
    marginBottom: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeButton: {
    flexGrow: 1,
    minWidth: '30%',
    marginBottom: 8,
  },
  themeButtonLabel: {
    fontSize: 12,
  },
  themeButtonContent: {
    height: 40,
  },
});
