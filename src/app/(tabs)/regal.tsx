import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Field } from '../../components/Field';
import { Bar, Button, Card, Chip, Cover, Empty, ErrorNote, Screen, Segmented, Sheet, T } from '../../components/ui';
import { addToShelf, removeShelfBook, shelf, updateShelfBook, type ShelfBook, type ShelfStatus } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { errorText } from '../../lib/supabase';
import { colors, fonts, MOOD_TAGS } from '../../lib/theme';
import { useLoad } from '../../lib/useAsync';

const TABS: [ShelfStatus, string][] = [
  ['reading', 'Lese gerade'],
  ['done', 'Gelesen'],
  ['want', 'Will ich lesen'],
];

export default function Shelf() {
  const { profile } = useAuth();
  const { data, error, reload, setData } = useLoad(shelf);
  const [tab, setTab] = useState<ShelfStatus>('reading');
  const [open, setOpen] = useState<ShelfBook | null>(null);
  const [adding, setAdding] = useState(false);

  const year = new Date().getFullYear();
  const doneThisYear = (data ?? []).filter((b) => b.status === 'done' && b.finished_at?.startsWith(String(year))).length;
  const goal = profile?.yearly_goal ?? 24;
  const items = (data ?? []).filter((b) => b.status === tab);

  async function patch(book: ShelfBook, p: Partial<ShelfBook>) {
    const next = { ...book, ...p };
    setOpen(next);
    setData((list) => (list ?? []).map((b) => (b.id === book.id ? next : b)));
    try {
      await updateShelfBook(book.id, p);
    } catch {
      reload();
    }
  }

  return (
    <Screen contentStyle={{ gap: 14, paddingTop: 14 }}>
      <T v="h1">Mein Regal</T>
      <Card style={{ gap: 8 }}>
        <T v="eyebrow">Jahresziel {year}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T style={styles.big}>{doneThisYear}</T>
          <T v="muted">von {goal} Büchern</T>
        </View>
        <Bar value={doneThisYear / goal} />
      </Card>
      {error && <ErrorNote text={error} onRetry={reload} />}
      <Segmented options={TABS} value={tab} onChange={setTab} />
      {items.length ? (
        <View style={styles.grid}>
          {items.map((b) => (
            <Pressable key={b.id} style={styles.item} onPress={() => setOpen(b)}>
              <Cover title={b.title} url={b.cover_url} size="md" />
              <T v="bold" numberOfLines={2} style={{ fontSize: 13, lineHeight: 16 }}>
                {b.title}
              </T>
              {b.rating ? (
                <T style={{ color: colors.honey, fontSize: 13 }}>{'★'.repeat(b.rating) + '☆'.repeat(5 - b.rating)}</T>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty text="Hier ist noch Platz." />
      )}
      <Button title="+ Buch ins Regal" kind="ghost" onPress={() => setAdding(true)} />

      <Sheet visible={!!open} onClose={() => setOpen(null)}>
        {open && (
          <>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end' }}>
              <Cover title={open.title} url={open.cover_url} size="lg" />
              <View style={{ flex: 1 }}>
                <T v="h2">{open.title}</T>
                <T v="muted">{open.author}</T>
              </View>
            </View>
            <Segmented
              options={[
                ['reading', 'Lese gerade'],
                ['done', 'Gelesen'],
                ['want', 'Will ich'],
              ]}
              value={open.status}
              onChange={(s) =>
                patch(open, { status: s, finished_at: s === 'done' ? new Date().toISOString().slice(0, 10) : null })
              }
            />
            <T v="eyebrow">Bewertung</T>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => patch(open, { rating: i })} hitSlop={6}>
                  <T style={{ fontSize: 28, color: colors.honey }}>{i <= (open.rating ?? 0) ? '★' : '☆'}</T>
                </Pressable>
              ))}
            </View>
            <T v="eyebrow">Mood-Tags</T>
            <View style={styles.chips}>
              {MOOD_TAGS.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  on={open.tags.includes(t)}
                  onPress={() =>
                    patch(open, { tags: open.tags.includes(t) ? open.tags.filter((x) => x !== t) : [...open.tags, t] })
                  }
                />
              ))}
            </View>
            <Button title="Fertig" onPress={() => setOpen(null)} />
            <Button
              title="Aus dem Regal entfernen"
              kind="danger"
              onPress={async () => {
                const id = open.id;
                setOpen(null);
                await removeShelfBook(id).catch(() => {});
                reload();
              }}
            />
          </>
        )}
      </Sheet>

      <AddBook visible={adding} onClose={() => setAdding(false)} onAdded={(s) => { setTab(s); reload(); }} />
    </Screen>
  );
}

function AddBook({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: (s: ShelfStatus) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<ShelfStatus>('want');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) return setError('Gib einen Titel ein.');
    setBusy(true);
    try {
      await addToShelf({ title: title.trim(), author: author.trim(), cover_url: null }, status);
      setTitle('');
      setAuthor('');
      setError(null);
      onClose();
      onAdded(status);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <T v="h2">Buch ins Regal</T>
      <Field label="Titel" value={title} onChangeText={setTitle} />
      <Field label="Autorin" value={author} onChangeText={setAuthor} />
      <Segmented options={TABS} value={status} onChange={setStatus} />
      {error && <ErrorNote text={error} />}
      <Button title="Hinzufügen" onPress={save} loading={busy} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  item: { width: 96, gap: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
