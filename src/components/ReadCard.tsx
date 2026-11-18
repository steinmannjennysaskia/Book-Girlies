import { router } from 'expo-router';
import { View } from 'react-native';

import type { ReadWithMembers } from '../lib/api';
import { PUBLIC_LIMIT } from '../lib/theme';
import { Card, Cover, GroupTrack, Pill, T } from './ui';

export function ReadCard({ read, me }: { read: ReadWithMembers; me?: string }) {
  const mine = read.members.find((m) => m.user_id === me);
  const sub = mine
    ? `Du: Kapitel ${mine.chapter} von ${read.chapters}`
    : `${read.members.length} von ${PUBLIC_LIMIT} Plätzen belegt`;
  return (
    <Card onPress={() => router.push(`/read/${read.id}`)} style={{ flexDirection: 'row', gap: 14 }}>
      <Cover title={read.title} url={read.cover_url} />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Pill label={read.is_public ? 'Öffentlich' : 'Privat'} kind={read.is_public ? 'public' : 'private'} />
        <T v="h3" numberOfLines={2}>
          {read.title}
        </T>
        <T v="muted" numberOfLines={1}>
          {read.author ? `${read.author} · ` : ''}
          {sub}
        </T>
        <GroupTrack members={read.members} chapters={read.chapters} me={me} />
      </View>
    </Card>
  );
}
