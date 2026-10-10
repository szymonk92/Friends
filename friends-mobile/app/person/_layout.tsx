import { Stack } from 'expo-router';

// Native header off: each person screen renders its own <AppBar>.
export default function PersonLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
