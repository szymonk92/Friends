import { View, StyleSheet } from 'react-native';
import { Card, Text, List, Divider, Menu, Button } from 'react-native-paper';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
];

export default function LanguageSelector() {
    const { t, i18n } = useTranslation();
    const [menuVisible, setMenuVisible] = useState(false);

    const currentLanguage =
        LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

    const handleLanguageChange = async (languageCode: string) => {
        await i18n.changeLanguage(languageCode);
        setMenuVisible(false);
    };

    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    {t('settings.language')}
                </Text>
                <Divider style={styles.divider} />

                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                        <List.Item
                            title={t('settings.selectLanguage')}
                            description={currentLanguage.nativeLabel}
                            left={(props) => <List.Icon {...props} icon="translate" />}
                            right={(props) => <List.Icon {...props} icon="chevron-down" />}
                            onPress={() => setMenuVisible(true)}
                            style={styles.listItem}
                        />
                    }
                >
                    {LANGUAGES.map((language) => (
                        <Menu.Item
                            key={language.code}
                            onPress={() => handleLanguageChange(language.code)}
                            title={language.nativeLabel}
                            leadingIcon={
                                i18n.language === language.code ? 'check' : undefined
                            }
                        />
                    ))}
                </Menu>
            </Card.Content>
        </Card>
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
    listItem: {
        paddingHorizontal: 0,
    },
});
