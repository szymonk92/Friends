import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PersonLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="[id]" options={{ title: t('screens.person') }} />
      <Stack.Screen name="edit" options={{ title: t('screens.editPerson') }} />
      <Stack.Screen name="add-relation" options={{ title: t('screens.addRelation') }} />
      <Stack.Screen name="add-connection" options={{ title: t('screens.addConnection') }} />
      <Stack.Screen name="edit-relation" options={{ title: t('screens.editRelation') }} />
      <Stack.Screen name="edit-connection" options={{ title: t('screens.editConnection') }} />
      <Stack.Screen name="manage-relations" options={{ title: t('screens.manageRelations') }} />
      <Stack.Screen name="manage-connections" options={{ title: t('screens.manageConnections') }} />
    </Stack>
  );
}
