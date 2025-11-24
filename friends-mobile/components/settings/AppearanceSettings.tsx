import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, Button } from 'react-native-paper';
import { THEME_COLORS, type ThemeColor } from '@/store/useSettings';

interface AppearanceSettingsProps {
    themeColor: ThemeColor;
    setThemeColor: (color: ThemeColor) => void;
}

export default function AppearanceSettings({ themeColor, setThemeColor }: AppearanceSettingsProps) {
    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    Appearance
                </Text>
                <Divider style={styles.divider} />

                <Text variant="bodySmall" style={styles.description}>
                    Customize the look and feel of the app by choosing your preferred theme color.
                </Text>

                <Text variant="labelMedium" style={styles.themeLabel}>
                    Theme Color
                </Text>
                <View style={styles.themeGrid}>
                    {(Object.keys(THEME_COLORS) as ThemeColor[]).map((color) => (
                        <Button
                            key={color}
                            mode={themeColor === color ? 'contained' : 'outlined'}
                            onPress={() => setThemeColor(color)}
                            style={[
                                styles.themeButton,
                                {
                                    backgroundColor:
                                        themeColor === color ? THEME_COLORS[color] : THEME_COLORS[color] + '20',
                                }, // 20 = 12.5% opacity
                            ]}
                            labelStyle={[
                                styles.themeButtonLabel,
                                { color: '#FFFFFF' }, // White text for all buttons
                            ]}
                            contentStyle={styles.themeButtonContent}
                        >
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                        </Button>
                    ))}
                </View>
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
    description: {
        marginBottom: 16,
        opacity: 0.7,
    },
    themeLabel: {
        marginBottom: 8,
    },
    themeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    themeButton: {
        flexGrow: 1,
        minWidth: '30%',
        marginBottom: 8,
    },
    themeButtonLabel: {
        fontSize: 12,
    },
    themeButtonContent: {
        height: 40,
    },
});
