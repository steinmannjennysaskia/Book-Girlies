import { Image } from 'expo-image';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReadCard } from '../../components/ReadCard';
import { Avatar, Button, Card, Empty, ErrorNote, LinkButton, Section, T } from '../../components/ui';
import { feed, myReads, myStreak, publicReads } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../lib/theme';
import { useLoad } from '../../lib/useAsync';

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} T.`;
}

export default function Home() {
  const { session, profile } = useAuth();
  const me = session?.user.id;
  const { data, error, loading, reload } = useLoad(async () => {
    const [mine, events, streak, pub] = await Promise.all([myReads(), feed(), myStreak(), publicReads()]);
    return { mine, events, streak, pub };
  });

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.rust} />}
      >
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/book-girlies.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ top: '0%', left: '50%' }}
            accessibilityLabel="Book Girlies"
          />
        </View>
        <View style={styles.body}>
          <View style={styles.greet}>
            <View style={{ flex: 1 }}>
              <T v="eyebrow">Hallo {profile?.name ?? ''}</T>
              <T v="h1">Was liest du heute?</T>
            </View>
            <View style={styles.streak}>
              <T style={styles.streakText}>🔥 {data?.streak ?? 0}</T>
            </View>
          </View>

          {error && <ErrorNote text={error} onRetry={reload} />}

          <Section title="Meine Buddy Reads" action={<LinkButton title="+ Neu" onPress={() => router.push('/neu')} />}>
            {data?.mine.length ? (
              data.mine.map((r) => <ReadCard key={r.id} read={r} me={me} />)
            ) : (
              <Card style={{ gap: 10 }}>
                <T v="muted">Noch kein Buddy Read. Starte einen und lade deine Freundinnen ein, oder tritt mit einem Code bei.</T>
                <Button title="Buddy Read starten" onPress={() => router.push('/neu')} />
                <Button title="Ich habe einen Code" kind="ghost" onPress={() => router.push('/beitreten')} />
              </Card>
            )}
          </Section>

          <Section title="Neuigkeiten">
            <Card style={{ padding: 0 }}>
              {data?.events.length ? (
                data.events.slice(0, 8).map((e, i) => (
                  <View key={e.id} style={[styles.feedItem, i > 0 && styles.feedBorder]}>
                    <Avatar name={e.profile?.name ?? '?'} color={e.profile?.color ?? colors.muted} />
                    <View style={{ flex: 1 }}>
                      <T>
                        <T v="bold">{e.user_id === me ? 'Du' : e.profile?.name}</T>{' '}
                        {e.finished
                          ? `${e.user_id === me ? 'hast' : 'hat'} „${e.read?.title}“ beendet 🎉`
                          : `${e.user_id === me ? 'hast' : 'hat'} Kapitel ${e.chapter} von „${e.read?.title}“ beendet 🔥`}
                      </T>
                      <T v="muted">{ago(e.created_at)}</T>
                    </View>
                  </View>
                ))
              ) : (
                <Empty text="Hier siehst du, wenn deine Buddies ein Kapitel beenden." />
              )}
            </Card>
          </Section>

          <Section
            title="Öffentlich mitlesen"
            action={<LinkButton title="Alle" onPress={() => router.push('/(tabs)/entdecken')} />}
          >
            {data?.pub.length ? (
              data.pub.slice(0, 2).map((r) => <ReadCard key={r.id} read={r} me={me} />)
            ) : (
              <Empty text="Gerade keine offenen Runden. Starte doch selbst eine!" />
            )}
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, backgroundColor: colors.paper, overflow: 'hidden' },
  body: { paddingHorizontal: 16 },
  greet: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  streak: { backgroundColor: colors.rustSoft, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  streakText: { color: colors.rust, fontFamily: fonts.bodyBlack },
  feedItem: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  feedBorder: { borderTopWidth: 1, borderTopColor: colors.line },
});
