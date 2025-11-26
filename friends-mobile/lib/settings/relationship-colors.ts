import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RelationshipColorMap {
  [key: string]: string;
}

export const DEFAULT_COLORS: RelationshipColorMap = {
  friend: '#81C784',      // Soft green (less saturated)
  family: '#F06292',      // Soft pink (less saturated)
  colleague: '#64B5F6',   // Soft blue (less saturated)
  acquaintance: '#B0BEC5', // Soft grey
  partner: '#E57373',     // Soft red (less saturated)
};

export const AVAILABLE_COLORS = [
  { name: 'Soft Red', value: '#E57373' },
  { name: 'Soft Pink', value: '#F06292' },
  { name: 'Soft Purple', value: '#BA68C8' },
  { name: 'Soft Deep Purple', value: '#9575CD' },
  { name: 'Soft Indigo', value: '#7986CB' },
  { name: 'Soft Blue', value: '#64B5F6' },
  { name: 'Soft Light Blue', value: '#4FC3F7' },
  { name: 'Soft Cyan', value: '#4DD0E1' },
  { name: 'Soft Teal', value: '#4DB6AC' },
  { name: 'Soft Green', value: '#81C784' },
  { name: 'Soft Light Green', value: '#AED581' },
  { name: 'Soft Lime', value: '#DCE775' },
  { name: 'Soft Yellow', value: '#FFF176' },
  { name: 'Soft Amber', value: '#FFD54F' },
  { name: 'Soft Orange', value: '#FFB74D' },
  { name: 'Soft Deep Orange', value: '#FF8A65' },
  { name: 'Soft Brown', value: '#A1887F' },
  { name: 'Soft Grey', value: '#B0BEC5' },
  { name: 'Soft Blue Grey', value: '#90A4AE' },
];

const STORAGE_KEY = 'relationship_colors';

export async function getRelationshipColors(): Promise<RelationshipColorMap> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('Failed to save relationship color:', error);
    throw error;
  }
}

export async function resetRelationshipColors(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset relationship colors:', error);
    throw error;
  }
}
