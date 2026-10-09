import { View, StyleSheet, Text } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { FormSection } from '@/components/FormKit';
import { fz, fzText } from '@/lib/design/tokens';

interface DataStats {
  people: number;
  relations: number;
  connections: number;
  stories: number;
  events: number;
}

interface DataStatisticsProps {
  stats: DataStats | undefined;
  loading: boolean;
}

const KEYS = ['people', 'relations', 'connections', 'stories', 'events'] as const;

export default function DataStatistics({ stats, loading }: DataStatisticsProps) {
  const { t } = useTranslation();
  return (
    <FormSection title={t('dataStats.title')}>
      {loading ? (
        <ActivityIndicator color={fz.ink} />
      ) : (
        KEYS.map((key) => (
          <View key={key} style={styles.statRow}>
            <Text style={fzText.body}>{t(`dataStats.${key}`)}</Text>
            <Text style={fzText.name}>{stats?.[key] || 0}</Text>
          </View>
        ))
      )}
    </FormSection>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: fz.s.xs,
  },
});
