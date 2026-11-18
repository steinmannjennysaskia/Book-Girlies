import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, Cover, Empty, ErrorNote, Loading, Screen, T } from '../../components/ui';
import { joinPublic, publicReads, type ReadWithMembers } from '../../lib/api';
import { errorText } from '../../lib/supabase';
import { colors, PUBLIC_LIMIT } from '../../lib/theme';
import { useLoad } from '../../lib/useAsync';

export default function Discover() {
  const { data, error, loading, reload } = useLoad(publicReads);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function join(r: ReadWithMembers) {
    setJoining(r.id);
    setJoinError(null);
    try {
      await joinPublic(r);
      router.push(`/read/${r.id}`);
    } catch (e) {
      setJoinError(errorText(e));
      reload();
    } finally {
      setJoining(null);
    }
  }

  return (
    <Screen contentStyle={{ gap: 14, paddingTop: 14 }}>
      <T v="h1">Entdecken</T>
      <T v="muted">
        Öffentliche Buddy Reads mit höchstens {PUBLIC_LIMIT} Leserinnen. Wer stört, kann gemeldet und blockiert werden.
      </T>
      <Button title="Ich habe einen Einladungscode" kind="ghost" onPress={() => router.push('/beitreten')} />
      {error && <ErrorNote text={error} onRetry={reload} />}
      {joinError && <ErrorNote text={joinError} />}
      {loading && !data ? (
        <Loading />
      ) : data?.length ? (
        data.map((r) => {
          const full = r.members.length >= PUBLIC_LIMIT;
          return (
            <Card key={r.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Cover title={r.title} url={r.cover_url} />
                <View style={{ flex: 1, gap: 5 }}>
                  <T v="h3">{r.title}</T>
                  <T v="muted">
                    {r.author ? `${r.author} · ` : ''}
                    {r.chapters} Kapitel
                  </T>
                  <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}>
                    {r.members.map((m) => (
                      <Avatar key={m.user_id} name={m.profile?.name ?? '?'} color={m.profile?.color ?? colors.muted} />
                    ))}
                  </View>
                  <T v="muted">
                    {r.members.length}/{PUBLIC_LIMIT} Plätze
                  </T>
                </View>
              </View>
              <Button
                title={full ? 'Runde ist voll' : 'Mitlesen'}
                kind={full ? 'ghost' : 'sage'}
                disabled={full}
                loading={joining === r.id}
                onPress={() => join(r)}
              />
            </Card>
          );
        })
      ) : (
        <Empty text="Gerade gibt es keine offene Runde. Starte selbst eine öffentliche!" />
      )}
    </Screen>
  );
}
