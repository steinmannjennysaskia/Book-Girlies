import { Fraunces_500Medium, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '../components/ui';
import { AuthProvider } from '../lib/auth';
import { colors, fonts } from '../lib/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        {!loaded ? (
          <Loading />
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.rust,
              headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
              headerShadowVisible: false,
              headerBackTitle: 'Zurück',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="neu" options={{ headerShown: true, title: 'Neuer Buddy Read', presentation: 'modal' }} />
            <Stack.Screen name="beitreten" options={{ headerShown: true, title: 'Mit Code beitreten', presentation: 'modal' }} />
            <Stack.Screen name="read/[id]/index" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="read/[id]/[chapter]" options={{ headerShown: true, title: '' }} />
          </Stack>
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
