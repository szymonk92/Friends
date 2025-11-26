import { StyleSheet, ScrollView, Alert, View } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { useExportData, useExportStats, useExportPeopleCSV, useImportData } from '@/hooks/useDataExport';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExportImportSettings from '@/components/settings/ExportImportSettings';

export default function MenuScreen() {
    const { t } = useTranslation();
    const exportData = useExportData();
    const exportCSV = useExportPeopleCSV();
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
            <Stack.Screen options={{ title: 'Menu' }} />
            <ScrollView style={styles.container}>

                {/* Experimental */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleLarge" style={styles.sectionTitle}>
                            {t('settings.experimental')}
                        </Text>
                        <Divider style={styles.divider} />
                        <Text variant="bodySmall" style={styles.description}>
                            Features that are currently in development.
                        </Text>
                        <Button
                            mode="outlined"
                            onPress={() => router.push('/network')}
                            icon="share-variant"
                            style={styles.button}
                        >
                            Network Graph
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => router.push('/party-planner')}
                            icon="party-popper"
                            style={styles.button}
                        >
                            Party Planner
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => router.push('/food-quiz')}
                            icon="food"
                            style={styles.button}
                        >
                            Food Quiz
                        </Button>
                    </Card.Content>
                </Card>

                {/* Developer Tools */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleLarge" style={styles.sectionTitle}>
                            {t('settings.developerTools')}
                        </Text>
                        <Divider style={styles.divider} />

                        <Text variant="bodySmall" style={styles.description}>
                            Testing utilities for development. Generate test data, seed sample people, and debug the
                            application.
                        </Text>

                        <Button
                            mode="outlined"
                            onPress={() => router.push('/dev')}
                            icon="code-tags"
                            style={styles.button}
                        >
                            Open Dev Tools
                        </Button>
                    </Card.Content>
                </Card>

                <ExportImportSettings
                    handleExportJSON={handleExportJSON}
                    exportDataPending={exportData.isPending}
                    handleExportCSV={handleExportCSV}
                    exportCSVPending={exportCSV.isPending}
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
        backgroundColor: '#f5f5f5',
        paddingTop: 16,
    },
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
    spacer: {
        height: 40,
    },
});
