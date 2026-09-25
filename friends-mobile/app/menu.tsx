import { StyleSheet, ScrollView, Alert, View } from 'react-native';
import { Button } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import {
  useExportData,
  useExportStats,
  useExportPeopleCSV,
  useExportObsidian,
  useImportData,
} from '@/hooks/useDataExport';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fz } from '@/lib/design/tokens';
import { FormSection } from '@/components/FormKit';
import ExportImportSettings from '@/components/settings/ExportImportSettings';

export default function MenuScreen() {
  const { t } = useTranslation();
  const exportData = useExportData();
  const exportCSV = useExportPeopleCSV();
  const exportObsidian = useExportObsidian();
  const importData = useImportData();
  const [importLoading, setImportLoading] = useState(false);

  const handleExportJSON = async () => {
    try {
      await exportData.mutateAsync();
      Alert.alert('Success', 'Data exported successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export data');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSV.mutateAsync();
      Alert.alert('Success', 'People exported to CSV!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export CSV');
    }
  };

  const handleExportObsidian = async () => {
    try {
      await exportObsidian.mutateAsync();
      Alert.alert('Success', 'Obsidian vault exported successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export Obsidian vault');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setImportLoading(true);

      // Read file content
      const expoFile = new ExpoFile(file.uri);
      const content = await expoFile.text();

      const importResult = await importData.mutateAsync(content);

      if (importResult.errors.length > 0) {
        Alert.alert(
          'Import Complete',
          `Imported ${importResult.imported} items.\n\nWarnings:\n${importResult.errors.slice(0, 5).join('\n')}${importResult.errors.length > 5 ? `\n...and ${importResult.errors.length - 5} more` : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', `Imported ${importResult.imported} items successfully!`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to import data');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Menu',
          headerStyle: { backgroundColor: fz.paper },
          headerTintColor: fz.ink,
          headerTitleStyle: { fontFamily: fz.font, fontWeight: '600', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <FormSection
          title={t('settings.experimental')}
          hint="Features that are currently in development."
        >
          <Button
            mode="outlined"
            onPress={() => router.push('/network')}
            icon="share-variant"
            textColor={fz.ink}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Network Graph
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/party-planner')}
            icon="party-popper"
            textColor={fz.ink}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Party Planner
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/food-quiz')}
            icon="food"
            textColor={fz.ink}
            style={[styles.button, styles.lastButton]}
            labelStyle={styles.buttonLabel}
          >
            Food Quiz
          </Button>
        </FormSection>

        <FormSection
          title={t('settings.developerTools')}
          hint="Testing utilities for development. Generate test data, seed sample people, and debug the application."
        >
          <Button
            mode="outlined"
            onPress={() => router.push('/dev')}
            icon="code-tags"
            textColor={fz.ink}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Open Dev Tools
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/developer/playground' as any)}
            icon="test-tube"
            textColor={fz.ink}
            style={[styles.button, styles.lastButton]}
            labelStyle={styles.buttonLabel}
          >
            AI Playground
          </Button>
        </FormSection>

        <ExportImportSettings
          handleExportJSON={handleExportJSON}
          exportDataPending={exportData.isPending}
          handleExportCSV={handleExportCSV}
          exportCSVPending={exportCSV.isPending}
          handleExportObsidian={handleExportObsidian}
          exportObsidianPending={exportObsidian.isPending}
          handleImport={handleImport}
          importLoading={importLoading}
          importDataPending={importData.isPending}
        />

        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fz.paper,
  },
  content: {
    padding: fz.s.edge,
  },
  button: {
    borderRadius: fz.rButton,
    borderColor: fz.outline,
    marginBottom: fz.s.md,
  },
  lastButton: {
    marginBottom: 0,
  },
  buttonLabel: {
    fontFamily: fz.font,
    fontWeight: '600',
  },
  spacer: {
    height: fz.s.xxl,
  },
});
