import * as SecureStore from 'expo-secure-store';

export interface RelationshipColorMap {
  [key: string]: string;
}

export const DEFAULT_COLORS: RelationshipColorMap = {
  friend: '#4CAF50',
  family: '#E91E63',
  colleague: '#2196F3',
  acquaintance: '#9E9E9E',
  partner: '#F44336',
  professional: '#FF9800',
};

export const AVAILABLE_COLORS = [
  { name: 'Red', value: '#F44336' },
  { name: 'Pink', value: '#E91E63' },
  { name: 'Purple', value: '#9C27B0' },
  { name: 'Deep Purple', value: '#673AB7' },
  { name: 'Indigo', value: '#3F51B5' },
  { name: 'Blue', value: '#2196F3' },
  { name: 'Light Blue', value: '#03A9F4' },
  { name: 'Cyan', value: '#00BCD4' },
  { name: 'Teal', value: '#009688' },
  { name: 'Green', value: '#4CAF50' },
  { name: 'Light Green', value: '#8BC34A' },
  { name: 'Lime', value: '#CDDC39' },
  { name: 'Yellow', value: '#FFEB3B' },
  { name: 'Amber', value: '#FFC107' },
  { name: 'Orange', value: '#FF9800' },
  { name: 'Deep Orange', value: '#FF5722' },
  { name: 'Brown', value: '#795548' },
  { name: 'Grey', value: '#9E9E9E' },
  { name: 'Blue Grey', value: '#607D8B' },
];

const STORAGE_KEY = 'relationship_colors';

export async function getRelationshipColors(): Promise<RelationshipColorMap> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_COLORS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load relationship colors:', error);
  }
  return { ...DEFAULT_COLORS };
}

export async function setRelationshipColor(relationshipType: string, color: string): Promise<void> {
  try {
    const current = await getRelationshipColors();
    current[relationshipType] = color;
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('Failed to save relationship color:', error);
    throw error;
  }
}

export async function resetRelationshipColors(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset relationship colors:', error);
    throw error;
  }
}
