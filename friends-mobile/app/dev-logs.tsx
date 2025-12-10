import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Chip } from 'react-native-paper';
import { devLogger } from '@/lib/utils/devLogger';
import * as Sharing from 'expo-sharing';

/**
 * Development Logs Viewer
 * Shows logs saved by devLogger and allows viewing/sharing/clearing
 */
export default function DevLogsScreen() {
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
        Alert.alert('No Logs', 'No log file exists yet');
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(logFile.uri, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Development Logs',
        });
      } else {
        Alert.alert('Not Available', 'Sharing is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to share logs: ${error}`);
    }
  };

  const handleClear = () => {
    Alert.alert('Clear Logs?', 'Are you sure you want to delete all development logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          devLogger.clearLogs();
          loadLogs();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleMedium">Log File Info</Text>
          {logInfo && (
            <View style={styles.infoRow}>
              <Chip icon="file-document">
                {logInfo.exists ? `${logInfo.sizeKB} KB` : 'No file'}
              </Chip>
              <Chip icon="folder">{logInfo.exists ? 'Exists' : 'Empty'}</Chip>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="contained" onPress={loadLogs} style={styles.button} loading={refreshing}>
          Refresh
        </Button>
        <Button mode="contained-tonal" onPress={handleShare} style={styles.button}>
          Share
        </Button>
        <Button mode="outlined" onPress={handleClear} style={styles.button}>
          Clear
        </Button>
      </View>

      <Text variant="titleSmall" style={styles.logsTitle}>
        Logs:
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
