import { StyleSheet } from 'react-native';

export const HEADER_ICON_SIZE = 24;

export const headerStyles = StyleSheet.create({
  // Custom Header Styles - Shared across all main tabs
  header: {
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '400',
    color: '#202124',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: -8, // Negative margin to bring icons closer together
  },
  headerIconButton: {
    marginRight: -8, // Negative margin to bring icons closer together
  },
});