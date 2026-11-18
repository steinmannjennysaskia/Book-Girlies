import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Button, Empty, ErrorNote, Loading, Sheet, T } from '../../../components/ui';
import {
  blockUser,
  chapterMessages,
  getRead,
  reportMessage,
  sendMessage,
  toggleReaction,
  type Message,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { errorText, supabase } from '../../../lib/supabase';
import { colors, fonts, REACTIONS } from '../../../lib/theme';
import { useLoad } from '../../../lib/useAsync';

export default function ChapterChat() {
  const params = useLocalSearchParams<{ id: string; chapter: string }>();
  const id = params.id;
  const chapter = parseInt(params.chapter, 10);
  const { session } = useAuth();
  const me = session?.user.id;
  const { data, error, loading, reload, setData } = useLoad(async () => {
    const [read, messages] = await Promise.all([getRead(id), chapterMessages(id, chapter)]);
    return { read, messages };
  }, [id, chapter]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<Message | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);

  // Live-Chat: neue Nachrichten und Reaktionen erscheinen sofort.
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${id}-${chapter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `read_id=eq.${id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, chapter, reload]);

  if (loading && !data) return <Loading />;
  const read = data?.read;
  const messages = data?.messages ?? [];
  const nameOf = (uid: string) => read?.members.find((m) => m.user_id === uid)?.profile;
  const ready = read ? read.members.filter((m) => m.chapter >= chapter).length : 0;

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(id, chapter, body);
      setText('');
      await reload();
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setSendError(errorText(e));
    } finally {
      setSending(false);
    }
  }

  async function react(m: Message, emoji: string) {
    if (!me) return;
    const on = !m.reactions.some((r) => r.user_id === me && r.emoji === emoji);
    // sofort anzeigen, dann speichern
    setData((d) =>
      d
        ? {
            ...d,
            messages: d.messages.map((x) =>
              x.id !== m.id
                ? x
                : {
                    ...x,
                    reactions: on
                      ? [...x.reactions, { user_id: me, emoji }]
                      : x.reactions.filter((r) => !(r.user_id === me && r.emoji === emoji)),
                  },
            ),
          }
        : d,
    );
    try {
      await toggleReaction(m.id, emoji, on);
    } catch {
      reload();
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: `Kapitel ${chapter}` }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              <View style={styles.notice}>
                <T>🛡️</T>
                <T style={{ flex: 1, fontSize: 13.5 }}>
                  Hier schreiben nur Leserinnen, die Kapitel {chapter} beendet haben. Du siehst nichts von späteren Kapiteln.{' '}
                  {read ? `${ready} von ${read.members.length} sind so weit.` : ''}
                </T>
              </View>
              {error && <ErrorNote text={error} onRetry={reload} />}
              {note && (
                <View style={styles.noteBox}>
                  <T>{note}</T>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={<Empty text="Noch keine Kommentare. Schreib den ersten!" />}
          renderItem={({ item: m }) => {
            const mine = m.user_id === me;
            const p = nameOf(m.user_id);
            return (
              <View style={[styles.msg, mine && { flexDirection: 'row-reverse' }]}>
                <Avatar name={p?.name ?? '?'} color={p?.color ?? colors.muted} />
                <View style={[styles.bubble, mine && styles.bubbleMine]}>
                  <View style={styles.who}>
                    <T style={styles.whoText}>
                      {mine ? 'Du' : p?.name ?? 'Ehemalige Leserin'} · {time(m.created_at)}
                    </T>
                    {!mine && (
                      <Pressable onPress={() => setMenuFor(m)} hitSlop={10} accessibilityLabel="Melden oder blockieren">
                        <T style={styles.whoText}>⋯</T>
                      </Pressable>
                    )}
                  </View>
                  <T>{m.body}</T>
                  <View style={styles.reacts}>
                    {REACTIONS.map((e) => {
                      const n = m.reactions.filter((r) => r.emoji === e).length;
                      const on = m.reactions.some((r) => r.emoji === e && r.user_id === me);
                      return (
                        <Pressable key={e} onPress={() => react(m, e)} style={[styles.react, on && styles.reactOn]}>
                          <T style={{ fontSize: 13 }}>
                            {e}
                            {n ? ` ${n}` : ''}
                          </T>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          }}
        />
        {sendError && (
          <View style={{ paddingHorizontal: 16 }}>
            <ErrorNote text={sendError} />
          </View>
        )}
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Was denkst du über Kapitel ${chapter}?`}
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Button title="Senden" onPress={send} loading={sending} disabled={!text.trim()} style={{ paddingVertical: 11 }} />
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)}>
        {menuFor && (
          <>
            <T v="h2">{nameOf(menuFor.user_id)?.name ?? 'Leserin'}</T>
            <Button
              title="⚑ Kommentar melden"
              kind="ghost"
              onPress={async () => {
                const m = menuFor;
                setMenuFor(null);
                try {
                  await reportMessage(m);
                  setNote('Gemeldet. Danke, wir sehen es uns an.');
                } catch (e) {
                  setNote(errorText(e));
                }
              }}
            />
            <Button
              title={`⛔ ${nameOf(menuFor.user_id)?.name ?? 'Leserin'} blockieren`}
              kind="danger"
              onPress={async () => {
                const m = menuFor;
                setMenuFor(null);
                try {
                  await blockUser(m.user_id);
                  setNote('Blockiert. Ihr seht eure Kommentare gegenseitig nicht mehr. Freigeben kannst du sie im Profil.');
                  reload();
                } catch (e) {
                  setNote(errorText(e));
                }
              }}
            />
            <T v="muted">Blockierte Personen siehst du nicht mehr, und sie sehen deine Kommentare nicht.</T>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function time(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return today ? hm : `${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}, ${hm}`;
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 8, backgroundColor: colors.sageSoft, borderRadius: 14, padding: 12 },
  noteBox: { backgroundColor: colors.rustSoft, borderRadius: 12, padding: 12 },
  msg: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 2,
  },
  bubbleMine: { backgroundColor: colors.rustSoft, borderColor: colors.rustSoft, borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  who: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  whoText: { fontFamily: fonts.bodyBlack, fontSize: 12, color: colors.muted },
  reacts: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 6 },
  react: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  reactOn: { borderColor: colors.rust, backgroundColor: colors.paper },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
});
