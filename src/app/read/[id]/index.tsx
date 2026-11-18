import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  Bar,
  Button,
  Card,
  Cover,
  ErrorNote,
  Loading,
  Pill,
  Screen,
  Section,
  Segmented,
  Sheet,
  T,
} from '../../../components/ui';
import { getRead, leaveRead, messageCounts, setChapter, toChapter } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { errorText, supabase } from '../../../lib/supabase';
import { colors, fonts, PUBLIC_LIMIT } from '../../../lib/theme';
import { useLoad } from '../../../lib/useAsync';

export default function ReadDetail() {
  const { id, invite } = useLocalSearchParams<{ id: string; invite?: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const { data, error, loading, reload } = useLoad(async () => {
    const [read, counts] = await Promise.all([getRead(id), messageCounts(id)]);
    return { read, counts };
  }, [id]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(invite === '1');
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Live: Fortschritt der anderen sofort anzeigen
  useEffect(() => {
    const ch = supabase
      .channel(`members-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `read_id=eq.${id}` }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading && !data) return <Loading />;
  const read = data?.read;
  if (!read) {
    return (
      <Screen>
        <ErrorNote text={error ?? 'Diesen Buddy Read gibt es nicht mehr, oder du bist nicht dabei.'} onRetry={reload} />
      </Screen>
    );
  }

  const mine = read.members.find((m) => m.user_id === me);
  const myChapter = mine?.chapter ?? 0;
  const minAll = Math.min(...read.members.map((m) => m.chapter));
  const done = myChapter >= read.chapters;

  async function update(ch: number) {
    if (!read) return;
    setBusy(true);
    try {
      const before = myChapter;
      const v = await setChapter(read, ch);
      if (v >= read.chapters) setToast('Buch beendet! 🎉 Es steht jetzt in deinem Regal.');
      else if (v > before) setToast(v - before > 1 ? `${v - before} Kapitel-Chats freigeschaltet 🔓` : `Chat zu Kapitel ${v} freigeschaltet 🔓`);
      else setToast('Fortschritt gespeichert');
      reload();
    } catch (e) {
      setToast(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const chaptersList = Array.from({ length: read.chapters }, (_, i) => i + 1);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} accessibilityLabel="Mehr">
              <T style={{ fontSize: 22, color: colors.rust }}>⋯</T>
            </Pressable>
          ),
        }}
      />
      <Screen edges={[]} contentStyle={{ paddingBottom: 110 }}>
        <View style={styles.head}>
          <Cover title={read.title} url={read.cover_url} size="lg" />
          <View style={{ flex: 1, gap: 6 }}>
            <Pill
              label={read.is_public ? `Öffentlich · ${read.members.length}/${PUBLIC_LIMIT}` : 'Privat'}
              kind={read.is_public ? 'public' : 'private'}
            />
            <T v="h1">{read.title}</T>
            <T v="muted">
              {read.author ? `${read.author} · ` : ''}
              {read.chapters} Kapitel · {read.pages} Seiten
            </T>
          </View>
        </View>

        <Section title="Wo seid ihr?" action={<T v="muted">Alle mind. bei Kap. {minAll}</T>}>
          <Card style={{ gap: 9 }}>
            {[...read.members]
              .sort((a, b) => b.chapter - a.chapter)
              .map((m) => (
                <View key={m.user_id} style={styles.mrow}>
                  <Avatar name={m.profile?.name ?? '?'} color={m.profile?.color ?? colors.muted} me={m.user_id === me} />
                  <T v="bold" numberOfLines={1} style={styles.mname}>
                    {m.user_id === me ? 'Du' : m.profile?.name}
                  </T>
                  <Bar value={m.chapter / read.chapters} color={m.user_id === me ? colors.rust : colors.sage} />
                  <T v="muted" style={styles.mnum}>
                    {m.chapter}/{read.chapters}
                  </T>
                </View>
              ))}
            <Pressable onPress={() => setInviteOpen(true)}>
              <T style={styles.inviteLink}>+ Freundinnen einladen</T>
            </Pressable>
          </Card>
        </Section>

        <Section title="Kapitel">
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {chaptersList.map((c, i) => {
              const open = myChapter >= c;
              const next = c === myChapter + 1;
              const count = data?.counts[c] ?? 0;
              const ready = read.members.filter((m) => m.chapter >= c).length;
              return (
                <Pressable
                  key={c}
                  disabled={!open}
                  onPress={() => router.push(`/read/${read.id}/${c}`)}
                  style={[styles.ch, i > 0 && styles.chBorder, next && { backgroundColor: colors.rustSoft }]}
                >
                  <View style={[styles.lock, { backgroundColor: open ? colors.sageSoft : colors.bg }]}>
                    <T>{open ? '🔓' : '🔒'}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="bold" style={!open && { color: colors.muted }}>
                      Kapitel {c}
                    </T>
                    <T v="muted" style={{ fontSize: 12.5 }}>
                      {open
                        ? `${count ? `${count} Kommentar${count > 1 ? 'e' : ''}` : 'Noch still hier'} · ${ready}/${read.members.length} sind so weit`
                        : next
                          ? 'Als Nächstes. Lies es, dann öffnet sich der Chat.'
                          : 'Gesperrt, damit du nichts verpasst'}
                    </T>
                  </View>
                  {open && <T style={{ color: colors.muted }}>›</T>}
                </Pressable>
              );
            })}
          </Card>
        </Section>
      </Screen>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <T style={{ color: colors.bg, fontFamily: fonts.bodyBold, textAlign: 'center' }}>{toast}</T>
        </View>
      )}

      <SafeAreaView edges={['bottom']} style={styles.cta}>
        <Button title="Seite / %" kind="ghost" onPress={() => setProgressOpen(true)} />
        <Button
          style={{ flex: 1 }}
          title={done ? 'Buch beendet 🎉' : `Kapitel ${myChapter + 1} gelesen`}
          disabled={done || !mine}
          loading={busy}
          onPress={() => update(myChapter + 1)}
        />
      </SafeAreaView>

      <ProgressSheet
        visible={progressOpen}
        onClose={() => setProgressOpen(false)}
        chapters={read.chapters}
        pages={read.pages}
        current={myChapter}
        onSave={(ch) => {
          setProgressOpen(false);
          update(ch);
        }}
      />

      <Sheet visible={inviteOpen} onClose={() => setInviteOpen(false)}>
        <T v="h2">Freundinnen einladen</T>
        <T>Schick diesen Code an deine Book Girlies. Damit kommen sie direkt in „{read.title}“.</T>
        <View style={styles.code}>
          <T style={styles.codeText} selectable>
            {read.invite_code}
          </T>
        </View>
        <Button
          title="Code teilen"
          onPress={() =>
            Share.share({
              message: `Lies mit mir „${read.title}“ in der Book-Girlies-App! Mein Einladungscode: ${read.invite_code}`,
            }).catch(() => {})
          }
        />
        <Button
          title="Code kopieren"
          kind="ghost"
          onPress={async () => {
            await Clipboard.setStringAsync(read.invite_code);
            setToast('Code kopiert');
            setInviteOpen(false);
          }}
        />
      </Sheet>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <T v="h2">{read.title}</T>
        <Button title="Fortschritt korrigieren" kind="ghost" onPress={() => { setMenuOpen(false); setProgressOpen(true); }} />
        <Button
          title="Buddy Read verlassen"
          kind="danger"
          onPress={async () => {
            setMenuOpen(false);
            await leaveRead(read.id).catch(() => {});
            router.back();
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}

function ProgressSheet({
  visible,
  onClose,
  chapters,
  pages,
  current,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  chapters: number;
  pages: number;
  current: number;
  onSave: (ch: number) => void;
}) {
  const [mode, setMode] = useState<'chapter' | 'page' | 'percent'>('page');
  const [chapter, setChapterVal] = useState(current);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) {
      setChapterVal(current);
      setValue('');
    }
  }, [visible, current]);

  const num = parseInt(value, 10);
  const result =
    mode === 'chapter'
      ? chapter
      : Number.isFinite(num)
        ? toChapter({ chapters, pages }, mode === 'page' ? 'page' : 'percent', Math.min(num, mode === 'page' ? pages : 100))
        : null;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <T v="h2">Fortschritt eintragen</T>
      <Segmented
        options={[
          ['chapter', 'Kapitel'],
          ['page', 'Seite'],
          ['percent', 'Prozent'],
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setValue('');
        }}
      />
      {mode === 'chapter' ? (
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => setChapterVal((c) => Math.max(0, c - 1))}>
            <T v="h2">−</T>
          </Pressable>
          <T style={styles.stepVal}>{chapter}</T>
          <Pressable style={styles.stepBtn} onPress={() => setChapterVal((c) => Math.min(chapters, c + 1))}>
            <T v="h2">+</T>
          </Pressable>
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={(t) => setValue(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder={mode === 'page' ? `Seite (von ${pages})` : 'Prozent (0 bis 100)'}
          placeholderTextColor={colors.muted}
          style={styles.bigInput}
          autoFocus
        />
      )}
      <View style={styles.result}>
        <T v="bold" style={{ textAlign: 'center' }}>
          {result === null ? 'Gib eine Zahl ein' : `Das entspricht: Kapitel ${result} von ${chapters} beendet`}
        </T>
      </View>
      <T v="muted">
        Seiten und Prozent rechnet die App ins Kapitel um. So öffnen sich nur Chats zu Kapiteln, die du schon gelesen hast.
      </T>
      <Button title="Speichern" disabled={result === null} onPress={() => result !== null && onSave(result)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 16, alignItems: 'flex-end', marginTop: 6 },
  mrow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mname: { width: 64, fontSize: 14 },
  mnum: { width: 48, textAlign: 'right', fontSize: 12.5 },
  inviteLink: { color: colors.rust, fontFamily: fonts.bodyBold, marginTop: 4 },
  ch: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  chBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  lock: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  toast: {
    position: 'absolute',
    top: 12,
    left: 24,
    right: 24,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  code: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.rust, borderRadius: 14, padding: 14, alignItems: 'center' },
  codeText: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  stepBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: { fontFamily: fonts.display, fontSize: 44, lineHeight: 52, minWidth: 90, textAlign: 'center' },
  bigInput: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 14,
    fontFamily: fonts.display,
    fontSize: 26,
    textAlign: 'center',
    color: colors.ink,
  },
  result: { backgroundColor: colors.sageSoft, borderRadius: 12, padding: 12 },
});
