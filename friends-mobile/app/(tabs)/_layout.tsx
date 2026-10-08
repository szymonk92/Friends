import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fz } from '@/lib/design/tokens';
import { LineIcon, type LineIconName } from '@/components/LineIcon';
import { useTranslation } from 'react-i18next';

// Bottom tab bar — kept (the design mockups omit it), restyled to the
// FriendZ language: line icons, ink active tint, warm paper surface.
// paddingBottom follows the system nav inset so the bar stays tappable
// under edgeToEdgeEnabled.
function TabIcon({ name, color, size = 22 }: { name: LineIconName; color: string; size?: number }) {
  return <LineIcon name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: fz.ink,
        tabBarInactiveTintColor: fz.textDim,
        tabBarStyle: {
          backgroundColor: fz.paper,
          borderTopColor: fz.hairline,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontFamily: fz.font, fontSize: 11, fontWeight: '600' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.people'),
          tabBarIcon: ({ color }) => <TabIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: t('navigation.stories'),
          tabBarIcon: ({ color }) => <TabIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: t('navigation.timeline'),
          tabBarIcon: ({ color }) => <TabIcon name="clock" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('navigation.search'),
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
    </Tabs>
  );
}