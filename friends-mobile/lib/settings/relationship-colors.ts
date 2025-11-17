import * as SecureStore from 'expo-secure-store';

const RELATIONSHIP_COLORS_KEY = 'relationship_colors';

export interface RelationshipColorMap {
  friend: string;
  family: string;
  colleague: string;
  acquaintance: string;
  partner: string;
  professional: string;
  [key: string]: string; // Allow custom relationship types
}

export const DEFAULT_COLORS: RelationshipColorMap = {
  friend: '#4CAF50', // Green
  family: '#E91E63', // Pink
  colleague: '#2196F3', // Blue
  acquaintance: '#9E9E9E', // Gray
  partner: '#F44336', // Red
  professional: '#FF9800', // Orange
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
  { name: 'Gray', value: '#9E9E9E' },
  { name: 'Blue Gray', value: '#607D8B' },
];

export async function getRelationshipColors(): Promise<RelationshipColorMap> {
  try {
    const stored = await SecureStore.getItemAsync(RELATIONSHIP_COLORS_KEY);
    if (stored) {
      return { ...DEFAULT_COLORS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load relationship colors:', error);
  }
  return DEFAULT_COLORS;
}

export async function saveRelationshipColors(colors: RelationshipColorMap): Promise<void> {
  try {
    await SecureStore.setItemAsync(RELATIONSHIP_COLORS_KEY, JSON.stringify(colors));
  } catch (error) {
    console.error('Failed to save relationship colors:', error);
    throw error;
  }
}

export async function setRelationshipColor(type: string, color: string): Promise<void> {
  const currentColors = await getRelationshipColors();
  currentColors[type] = color;
  await saveRelationshipColors(currentColors);
}

export async function resetRelationshipColors(): Promise<void> {
  await saveRelationshipColors(DEFAULT_COLORS);
}

export function getColorForRelationship(
  type: string | null | undefined,
  colors: RelationshipColorMap
): string {
  if (!type) return '#9E9E9E'; // Default gray
  return colors[type] || colors[type.toLowerCase()] || '#9E9E9E';
}
