import { Stack } from 'expo-router';

export default function PersonLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="[id]" options={{ title: 'Person' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit Person' }} />
      <Stack.Screen name="add-relation" options={{ title: 'Add Relation' }} />
      <Stack.Screen name="add-connection" options={{ title: 'Add Connection' }} />
      <Stack.Screen name="edit-relation" options={{ title: 'Edit Relation' }} />
    </Stack>
  );
}
