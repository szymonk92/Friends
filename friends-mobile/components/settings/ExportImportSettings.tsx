import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { fz } from '@/lib/design/tokens';
import { FormSection } from '@/components/FormKit';

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
  return (
    <>
      <FormSection
        title="Export Data"
        hint="Export your data to back it up or transfer to another device."
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
          Export All Data (JSON)
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
          Export People (CSV)
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
          Export to Obsidian
        </Button>
      </FormSection>

      <FormSection
        title="Import Data"
        hint="Import data from a previously exported JSON file. Duplicate people (by name) will be skipped."
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
          Import from JSON
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
