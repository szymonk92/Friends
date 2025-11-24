import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, Divider, Button } from 'react-native-paper';

interface ExportImportSettingsProps {
    handleExportJSON: () => void;
    exportDataPending: boolean;
    handleExportCSV: () => void;
    exportCSVPending: boolean;
    handleImport: () => void;
    importLoading: boolean;
    importDataPending: boolean;
}

export default function ExportImportSettings({
    handleExportJSON,
    exportDataPending,
    handleExportCSV,
    exportCSVPending,
    handleImport,
    importLoading,
    importDataPending,
}: ExportImportSettingsProps) {
    return (
        <>
            {/* Export Options */}
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleLarge" style={styles.sectionTitle}>
                        Export Data
                    </Text>
                    <Divider style={styles.divider} />

                    <Text variant="bodySmall" style={styles.description}>
                        Export your data to back it up or transfer to another device.
                    </Text>

                    <Button
                        mode="contained"
                        onPress={handleExportJSON}
                        loading={exportDataPending}
                        disabled={exportDataPending}
                        icon="file-export"
                        style={styles.button}
                    >
                        Export All Data (JSON)
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={handleExportCSV}
                        loading={exportCSVPending}
                        disabled={exportCSVPending}
                        icon="file-delimited"
                        style={styles.button}
                    >
                        Export People (CSV)
                    </Button>
                </Card.Content>
            </Card>

            {/* Import Options */}
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleLarge" style={styles.sectionTitle}>
                        Import Data
                    </Text>
                    <Divider style={styles.divider} />

                    <Text variant="bodySmall" style={styles.description}>
                        Import data from a previously exported JSON file. Duplicate people (by name) will be
                        skipped.
                    </Text>

                    <Button
                        mode="contained"
                        onPress={handleImport}
                        loading={importLoading || importDataPending}
                        disabled={importLoading || importDataPending}
                        icon="file-import"
                        style={styles.button}
                    >
                        Import from JSON
                    </Button>
                </Card.Content>
            </Card>
        </>
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
    button: {
        marginBottom: 12,
    },
});
