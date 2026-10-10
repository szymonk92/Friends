import { StyleSheet, ScrollView, View } from 'react-native';
import { Button, List } from 'react-native-paper';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import {
  useExportData,
  useExportStats,
  useExportPeopleCSV,
  useExportObsidian,
  useImportData,
} from '@/hooks/useDataExport';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fz } from '@/lib/design/tokens';
import { FormSection } from '@/components/FormKit';
import ExportImportSettings from '@/components/settings/ExportImportSettings';
import DataStatistics from '@/components/settings/DataStatistics';
import BirthdayReminderSettingsSection from '@/components/settings/BirthdayReminderSettings';
import {
  getBirthdayReminderSettings,
  saveBirthdayReminderSettings,
  type BirthdayReminderSettings,
} from '@/lib/notifications/birthday-reminders';
import { fzAlert } from '@/lib/utils/confirm';

export default function MenuScreen() {
  const { t } = useTranslation();
  const exportData = useExportData();
  const exportCSV = useExportPeopleCSV();
  const exportObsidian = useExportObsidian();
  const importData = useImportData();
  const [importLoading, setImportLoading] = useState(false);
  const { data: stats, isLoading: statsLoading } = useExportStats();

  const [birthdaySettings, setBirthdaySettings] = useState<BirthdayReminderSettings | null>(null);
  const [savingBirthdaySettings, setSavingBirthdaySettings] = useState(false);

  useEffect(() => {
    (async () => {
      setBirthdaySettings(await getBirthdayReminderSettings());
    })();
  }, []);

  const handleBirthdaySettingChange = async (key: keyof BirthdayReminderSettings, value: any) => {
    if (!birthdaySettings) return;

    const newSettings = { ...birthdaySettings, [key]: value };
    setBirthdaySettings(newSettings);

    setSavingBirthdaySettings(true);
    try {
      await saveBirthdayReminderSettings(newSettings);
    } catch (error) {
      fzAlert(t('common.error'), t('settingsScreen.saveFailed'));
    } finally {
      setSavingBirthdaySettings(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      await exportData.mutateAsync();
      fzAlert(t('common.success'), t('menu.exported'));
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('menu.exportFailed'));
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSV.mutateAsync();
      fzAlert(t('common.success'), t('menu.csvExported'));
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('menu.csvFailed'));
    }
  };

  const handleExportObsidian = async () => {
    try {
      await exportObsidian.mutateAsync();
      fzAlert(t('common.success'), t('menu.obsidianExported'));
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('menu.obsidianFailed'));
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
        fzAlert(
          t('menu.importComplete'),
          `${t('menu.importedItems', { count: importResult.imported })}\n\n${t('menu.warnings')}\n${importResult.errors.slice(0, 5).join('\n')}${importResult.errors.length > 5 ? `\n${t('menu.andMore', { count: importResult.errors.length - 5 })}` : ''}`,
          [{ text: t('common.ok') }]
        );
      } else {
        fzAlert(t('common.success'), t('menu.importedSuccess', { count: importResult.imported }));
      }
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('menu.importFailed'));
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <AppBar title={t('common.moreOptions')} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <FormSection title={t('settings.security')} hint={t('settingsScreen.secretsIntro')}>
          <Button
            mode="outlined"
            onPress={() => router.push('/secrets')}
            icon="shield-lock"
            textColor={fz.ink}
            style={[styles.button, styles.lastButton]}
            labelStyle={styles.buttonLabel}
          >
            {t('settingsScreen.manageSecrets')}
          </Button>
        </FormSection>

        <BirthdayReminderSettingsSection
          birthdaySettings={birthdaySettings}
          savingBirthdaySettings={savingBirthdaySettings}
          handleBirthdaySettingChange={handleBirthdaySettingChange}
        />

        <FormSection
          title={t('settings.experimental')}
          hint={t('menu.experimentalHint')}
        >
          <Button
            mode="outlined"
            onPress={() => router.push('/network')}
            icon="share-variant"
            textColor={fz.ink}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            {t('menu.networkGraph')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/party-planner')}
            icon="party-popper"
            textColor={fz.ink}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            {t('menu.partyPlanner')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/food-quiz')}
            icon="food"
            textColor={fz.ink}
            style={[styles.button, styles.lastButton]}
            labelStyle={styles.buttonLabel}
          >
            {t('foodQuiz.title')}
          </Button>
        </FormSection>

        <FormSection
          title={t('settings.developerTools')}
          hint={t('menu.devHint')}
        >
          <Button
            mode="outlined"
            onPress={() => router.push('/dev')}
            icon="code-tags"
            textColor={fz.ink}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            {t('menu.openDev')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/developer/playground' as any)}
            icon="test-tube"
            textColor={fz.ink}
            style={[styles.button, styles.lastButton]}
            labelStyle={styles.buttonLabel}
          >
            {t('menu.playground')}
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

        <DataStatistics stats={stats} loading={statsLoading} />

        <FormSection title={t('settings.about')}>
          <List.Item
            title={t('settingsScreen.appName')}
            description={t('settingsScreen.appDesc')}
            left={(props) => <List.Icon {...props} icon="account-group" />}
          />
          <List.Item
            title={t('settingsScreen.version')}
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title={t('settingsScreen.dataStorage')}
            description={t('settingsScreen.dataStorageDesc')}
            left={(props) => <List.Icon {...props} icon="database" />}
          />
        </FormSection>

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
