import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Field } from '../components/Field';
import { Button, Cover, ErrorNote, Screen, Segmented, T } from '../components/ui';
import { createRead, searchBooks, type BookHit } from '../lib/api';
import { errorText } from '../lib/supabase';
import { colors, PUBLIC_LIMIT } from '../lib/theme';

export default function NewRead() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<BookHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<BookHit | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [chapters, setChapters] = useState('');
  const [pages, setPages] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setHits(await searchBooks(query.trim()));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSearching(false);
    }
  }

  function pick(b: BookHit) {
    setPicked(b);
    setTitle(b.title);
    setAuthor(b.author);
    if (b.pages) setPages(String(b.pages));
    setHits([]);
  }

  async function create() {
    const c = parseInt(chapters, 10);
    const p = parseInt(pages, 10);
    if (!title.trim()) return setError('Gib einen Buchtitel ein.');
    if (!c || c < 1) return setError('Wie viele Kapitel hat das Buch? Das steht meist im Inhaltsverzeichnis.');
    if (!p || p < 1) return setError('Wie viele Seiten hat das Buch?');
    setBusy(true);
    setError(null);
    try {
      const id = await createRead({
        title: title.trim(),
        author: author.trim(),
        cover_url: picked?.cover_url ?? null,
        chapters: c,
        pages: p,
        is_public: visibility === 'public',
      });
      router.replace({ pathname: '/read/[id]', params: { id, invite: '1' } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom']} contentStyle={{ gap: 14, paddingTop: 8 }}>
      <T v="eyebrow">1 · Buch suchen</T>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Titel oder Autorin"
            value={query}
            onChangeText={setQuery}
            placeholder="z. B. Fourth Wing"
            returnKeyType="search"
            onSubmitEditing={search}
          />
        </View>
        <Button title="Suchen" onPress={search} loading={searching} style={{ paddingVertical: 12 }} />
      </View>
      {hits.map((b) => (
        <Pressable key={b.key} onPress={() => pick(b)} style={styles.hit}>
          <Cover title={b.title} url={b.cover_url} size="sm" />
          <View style={{ flex: 1 }}>
            <T v="bold" numberOfLines={2}>
              {b.title}
            </T>
            <T v="muted">
              {b.author}
              {b.pages ? ` · ${b.pages} Seiten` : ''}
            </T>
          </View>
        </Pressable>
      ))}

      <T v="eyebrow" style={{ marginTop: 8 }}>
        2 · Angaben prüfen
      </T>
      {picked && (
        <View style={styles.picked}>
          <Cover title={picked.title} url={picked.cover_url} size="sm" />
          <T v="muted" style={{ flex: 1 }}>
            Gefunden in Open Library. Die Kapitelzahl musst du selbst eintragen.
          </T>
        </View>
      )}
      <Field label="Buchtitel" value={title} onChangeText={setTitle} />
      <Field label="Autorin" value={author} onChangeText={setAuthor} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Kapitel" value={chapters} onChangeText={setChapters} keyboardType="number-pad" placeholder="z. B. 24" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Seiten" value={pages} onChangeText={setPages} keyboardType="number-pad" placeholder="z. B. 380" />
        </View>
      </View>

      <T v="eyebrow" style={{ marginTop: 8 }}>
        3 · Wer darf mitlesen?
      </T>
      <Segmented
        options={[
          ['private', '🔒 Privat'],
          ['public', '🌍 Öffentlich'],
        ]}
        value={visibility}
        onChange={setVisibility}
      />
      <T v="muted">
        {visibility === 'private'
          ? 'Nur wer deinen Einladungscode hat, kann mitlesen.'
          : `Jede kann beitreten, bis ${PUBLIC_LIMIT} Plätze belegt sind. Melden und Blockieren ist immer möglich.`}
      </T>
      {error && <ErrorNote text={error} />}
      <Button title="Buddy Read starten" onPress={create} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hit: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 8,
  },
  picked: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.sageSoft, borderRadius: 12, padding: 8 },
});
