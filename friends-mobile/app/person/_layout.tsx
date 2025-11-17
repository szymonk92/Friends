import { Stack } from 'expo-router';

export default function PersonLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ headerShown: true }} />
    </Stack>
  );
}
