import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { Loading } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const { ready, session } = useAuth();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/" />;

  const icon =
    (on: IconName, off: IconName) =>
    ({ color, focused }: { color: unknown; focused: boolean }) => (
      <Ionicons name={focused ? on : off} size={24} color={typeof color === 'string' ? color : undefined} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rust,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Start', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="entdecken" options={{ title: 'Entdecken', tabBarIcon: icon('compass', 'compass-outline') }} />
      <Tabs.Screen name="regal" options={{ title: 'Regal', tabBarIcon: icon('library', 'library-outline') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
