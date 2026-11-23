import { StyleSheet, View } from 'react-native';
import { fz } from '@/lib/design/tokens';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FormSection } from '@/components/FormKit';
import { useTranslation } from 'react-i18next';

interface ExportImportSettingsProps {
  handleExportJSON: () => void;
  exportDataPending: boolean;
  handleExportCSV: () => void;
  exportCSVPending: boolean;
  handleExportObsidian: () => void;
  exportObsidianPending: boolean;
  handleImport: () => void;
  importLoading: boolean;
  importDataPending: boolean;
}

export default function ExportImportSettings({
  handleExportJSON,
  exportDataPending,
  handleExportCSV,
  exportCSVPending,
  handleExportObsidian,
  exportObsidianPending,
  handleImport,
  importLoading,
  importDataPending,
}: ExportImportSettingsProps) {
  const { t } = useTranslation();
  return (
    <>
      <FormSection title={t('exportImport.exportTitle')} hint={t('exportImport.exportHint')}>
        <View style={styles.stack}>
          <PrimaryButton
            onPress={handleExportJSON}
            disabled={exportDataPending}
            label={t('exportImport.json')}
          />

          <PrimaryButton
            variant="outline"
            onPress={handleExportCSV}
            disabled={exportCSVPending}
            label={t('exportImport.csv')}
          />

          <PrimaryButton
            variant="outline"
            onPress={handleExportObsidian}
            disabled={exportObsidianPending}
            label={t('exportImport.obsidian')}
          />
        </View>
      </FormSection>

      <FormSection title={t('exportImport.importTitle')} hint={t('exportImport.importHint')}>
        <PrimaryButton
          onPress={handleImport}
          disabled={importLoading || importDataPending}
          label={t('exportImport.importJson')}
        />
      </FormSection>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: fz.s.md },
});
