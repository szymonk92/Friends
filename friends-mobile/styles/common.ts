import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export const useCommonStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    section: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.surfaceVariant,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontWeight: '600',
      fontSize: 18,
      color: theme.colors.onSurface,
    },
    emptyStateText: {
      fontStyle: 'italic',
      textAlign: 'center',
      marginBottom: 12,
      color: theme.colors.onSurfaceVariant,
    },
    sectionHeaderButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};
