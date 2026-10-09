import { Stack, router } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { headerIconOptions } from '@/components/IconCircle';

export default function PersonLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        // The first screen of this nested stack has no native back button (the
        // parent hides its header). Android has system back; iOS needs one.
        ...(Platform.OS === 'ios' &&
          navigation.getState().routes[0]?.key === route.key &&
          headerIconOptions('left', { icon: 'back', onPress: () => router.back() })),
      })}
    >
      <Stack.Screen name="[id]" options={{ title: t('screens.person') }} />
      <Stack.Screen name="edit" options={{ title: t('screens.editPerson') }} />
      <Stack.Screen name="add-relation" options={{ title: t('screens.addRelation') }} />
      <Stack.Screen name="add-connection" options={{ title: t('screens.addConnection') }} />
      <Stack.Screen name="edit-relation" options={{ title: t('screens.editRelation') }} />
      <Stack.Screen name="edit-connection" options={{ title: t('screens.editConnection') }} />
    </Stack>
  );
}
