import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FloatingDevTools } from '@react-buoy/core';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/components/useColorScheme';
import { runMigrations } from '@/lib/db/migrate';
import { checkOnboardingComplete } from './onboarding';
import { appLogger, logPerformance } from '@/lib/logger';
import { useSettings } from '@/store/useSettings';
import { createTheme } from '@/lib/theme';
import '@/lib/i18n'; // Initialize i18n
import '@/lib/i18n/types'; // Import type definitions

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [appReady, setAppReady] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      const perf = logPerformance(appLogger, 'appInitialization');
      appLogger.info('App starting', { fontsLoaded: true });

      // Run database migrations on app start
      runMigrations()
        .then(async () => {
          appLogger.info('Database migrations completed');

          // Check if onboarding is complete
          const onboardingComplete = await checkOnboardingComplete();
          appLogger.debug('Onboarding status', { complete: onboardingComplete });

          if (!onboardingComplete) {
            // Redirect to onboarding after navigation is ready
            appLogger.info('Redirecting to onboarding');
            setTimeout(() => {
              router.replace('/onboarding');
            }, 100);
          }

          perf.end(true);
          setAppReady(true);
          SplashScreen.hideAsync();
        })
        .catch((err) => {
          appLogger.error('Migration failed', { error: err });
          perf.end(false);
          setAppReady(true);
          SplashScreen.hideAsync();
        });
    }
  }, [loaded]);

  if (!loaded || !appReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { themeColor, loadThemeColor } = useSettings();

  useEffect(() => {
    loadThemeColor();
  }, []);

  const paperTheme = createTheme(themeColor, colorScheme === 'dark');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="person" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Add a Person' }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="food-quiz" options={{ presentation: 'modal' }} />
            </Stack>
            <FloatingDevTools environment="local" userRole="admin" />
          </ThemeProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
