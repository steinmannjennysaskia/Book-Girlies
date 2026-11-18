import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Loading, T } from '../components/ui';
import { useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';

/** Startbild: das Book-Girlies-Wohnzimmer. */
export default function Welcome() {
  const { ready, session } = useAuth();
  if (!ready) return <Loading />;
  if (session) return <Redirect href="/(tabs)" />;

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/book-girlies.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        accessibilityLabel="Book Girlies: vier Freundinnen lesen gemeinsam in einem gemütlichen Wohnzimmer"
      />
      <View style={styles.fade} />
      <SafeAreaView edges={['bottom']} style={styles.cta}>
        <T style={styles.tag}>Zusammen lesen. Ohne Spoiler.</T>
        {isConfigured ? (
          <Button title="Los geht's" onPress={() => router.push('/login')} />
        ) : (
          <View style={styles.setup}>
            <T v="bold">Fast fertig</T>
            <T v="small">
              Die App ist noch nicht mit der Datenbank verbunden. Trag EXPO_PUBLIC_SUPABASE_URL und
              EXPO_PUBLIC_SUPABASE_ANON_KEY in die Datei .env ein (siehe README) und starte neu.
            </T>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'flex-end' },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    backgroundColor: 'rgba(40,24,18,0.45)',
  },
  cta: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  tag: { color: '#FFF6EC', fontFamily: fonts.bodyBlack, fontSize: 17, paddingTop: 16 },
  setup: { backgroundColor: colors.paper, borderRadius: 14, padding: 14, gap: 4 },
});
