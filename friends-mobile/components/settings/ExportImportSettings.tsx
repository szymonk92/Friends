import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { fz } from '@/lib/design/tokens';
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
      <FormSection
        title={t('exportImport.exportTitle')}
        hint={t('exportImport.exportHint')}
      >
        <Button
          mode="contained"
          buttonColor={fz.ink}
          textColor={fz.paper}
          onPress={handleExportJSON}
          loading={exportDataPending}
          disabled={exportDataPending}
          icon="file-export"
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          {t('exportImport.json')}
        </Button>

        <Button
          mode="outlined"
          textColor={fz.ink}
          onPress={handleExportCSV}
          loading={exportCSVPending}
          disabled={exportCSVPending}
          icon="file-delimited"
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          {t('exportImport.csv')}
        </Button>

        <Button
          mode="outlined"
          textColor={fz.ink}
          onPress={handleExportObsidian}
          loading={exportObsidianPending}
          disabled={exportObsidianPending}
          icon="file-tree"
          style={[styles.button, styles.lastButton]}
          labelStyle={styles.buttonLabel}
        >
          {t('exportImport.obsidian')}
        </Button>
      </FormSection>

      <FormSection
        title={t('exportImport.importTitle')}
        hint={t('exportImport.importHint')}
      >
        <Button
          mode="contained"
          buttonColor={fz.ink}
          textColor={fz.paper}
          onPress={handleImport}
          loading={importLoading || importDataPending}
          disabled={importLoading || importDataPending}
          icon="file-import"
          style={[styles.button, styles.lastButton]}
          labelStyle={styles.buttonLabel}
        >
          {t('exportImport.importJson')}
        </Button>
      </FormSection>
    </>
  );
}

const styles = StyleSheet.create({
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
});
