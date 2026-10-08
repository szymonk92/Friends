import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { confirmDestructive } from '@/lib/utils/confirm';
import { Text, Button, Card, Chip } from 'react-native-paper';
import { devLogger } from '@/lib/utils/devLogger';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';

/**
 * Development Logs Viewer
 * Shows logs saved by devLogger and allows viewing/sharing/clearing
 */
export default function DevLogsScreen() {
  const { t } = useTranslation();
  const [logs, setLogs] = React.useState<string>('');
  const [logInfo, setLogInfo] = React.useState<any>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadLogs = async () => {
    setRefreshing(true);
    const content = await devLogger.readLogs();
    setLogs(content);
    const info = devLogger.getLogInfo();
    setLogInfo(info);
    setRefreshing(false);
  };

  React.useEffect(() => {
    loadLogs();
  }, []);

  const handleShare = async () => {
    try {
      const logFile = devLogger.getLogFile();
      if (!logFile) {
        Alert.alert(t('devLogs.noLogs'), t('devLogs.noLogsMessage'));
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(logFile.uri, {
          mimeType: 'text/plain',
          dialogTitle: t('devLogs.shareTitle'),
        });
      } else {
        Alert.alert(t('devLogs.notAvailable'), t('devLogs.notAvailableMessage'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('devLogs.shareFailed', { error: String(error) }));
    }
  };

  const handleClear = () => {
    confirmDestructive({
      title: t('devLogs.clearTitle'),
      message: t('devLogs.clearMessage'),
      confirmLabel: t('settingsScreen.clear'),
      onConfirm: () => {
        devLogger.clearLogs();
        loadLogs();
      },
    });
  };

  return (
    <View style={styles.container}>
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleMedium">{t('devLogs.info')}</Text>
          {logInfo && (
            <View style={styles.infoRow}>
              <Chip icon="file-document">
                {logInfo.exists ? `${logInfo.sizeKB} KB` : t('devLogs.noFile')}
              </Chip>
              <Chip icon="folder">{logInfo.exists ? t('devLogs.exists') : t('devLogs.empty')}</Chip>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="contained" onPress={loadLogs} style={styles.button} loading={refreshing}>
          {t('devLogs.refresh')}
        </Button>
        <Button mode="contained-tonal" onPress={handleShare} style={styles.button}>
          {t('devLogs.share')}
        </Button>
        <Button mode="outlined" onPress={handleClear} style={styles.button}>
          {t('settingsScreen.clear')}
        </Button>
      </View>

      <Text variant="titleSmall" style={styles.logsTitle}>
        {t('devLogs.logs')}
      </Text>

      <ScrollView style={styles.logsContainer}>
        <Text style={styles.logsText}>{logs}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
  },
  logsTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  logsText: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
});
