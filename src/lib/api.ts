import { supabase } from './supabase';

export type Profile = {
  id: string;
  name: string;
  color: string;
  tropes: string[];
  yearly_goal: number;
};

export type BuddyRead = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  chapters: number;
  pages: number;
  is_public: boolean;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type Member = {
  read_id: string;
  user_id: string;
  chapter: number;
  profile: Pick<Profile, 'id' | 'name' | 'color'> | null;
};

export type ReadWithMembers = BuddyRead & { members: Member[] };

export type Message = {
  id: string;
  read_id: string;
  chapter: number;
  user_id: string;
  body: string;
  created_at: string;
  reactions: { user_id: string; emoji: string }[];
};

export type FeedEvent = {
  id: string;
  read_id: string;
  user_id: string;
  chapter: number;
  finished: boolean;
  created_at: string;
  profile: Pick<Profile, 'name' | 'color'> | null;
  read: Pick<BuddyRead, 'title'> | null;
};

export type ShelfStatus = 'reading' | 'done' | 'want';

export type ShelfBook = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  status: ShelfStatus;
  rating: number | null;
  tags: string[];
  finished_at: string | null;
};

const READ_SELECT =
  '*, members(read_id, user_id, chapter, profile:profiles(id, name, color))';

function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

export async function myUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Bitte melde dich an.');
  return id;
}

// ---------- Profil ----------

export async function getProfile(id: string): Promise<Profile | null> {
  return check(await supabase.from('profiles').select('*').eq('id', id).maybeSingle());
}

export async function updateProfile(id: string, patch: Partial<Omit<Profile, 'id'>>) {
  check(await supabase.from('profiles').update(patch).eq('id', id));
}

// ---------- Buddy Reads ----------

export async function myReads(): Promise<ReadWithMembers[]> {
  const uid = await myUserId();
  const ids = check(await supabase.from('members').select('read_id').eq('user_id', uid)) as {
    read_id: string;
  }[];
  if (!ids.length) return [];
  return check(
    await supabase
      .from('buddy_reads')
      .select(READ_SELECT)
      .in(
        'id',
        ids.map((r) => r.read_id),
      )
      .order('created_at', { ascending: false }),
  ) as ReadWithMembers[];
}

export async function publicReads(): Promise<ReadWithMembers[]> {
  const uid = await myUserId();
  const rows = check(
    await supabase
      .from('buddy_reads')
      .select(READ_SELECT)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(40),
  ) as ReadWithMembers[];
  return rows.filter((r) => !r.members.some((m) => m.user_id === uid));
}

export async function getRead(id: string): Promise<ReadWithMembers | null> {
  return check(
    await supabase.from('buddy_reads').select(READ_SELECT).eq('id', id).maybeSingle(),
  ) as ReadWithMembers | null;
}

export async function createRead(input: {
  title: string;
  author: string;
  cover_url: string | null;
  chapters: number;
  pages: number;
  is_public: boolean;
}): Promise<string> {
  const id = check(
    await supabase.rpc('create_read', {
      p_title: input.title,
      p_author: input.author,
      p_cover_url: input.cover_url,
      p_chapters: input.chapters,
      p_pages: input.pages,
      p_is_public: input.is_public,
    }),
  ) as string;
  await addToShelf({ title: input.title, author: input.author, cover_url: input.cover_url }, 'reading');
  return id;
}

export async function joinByCode(code: string): Promise<string> {
  const id = check(await supabase.rpc('join_by_code', { code })) as string;
  const read = await getRead(id);
  if (read) await addToShelf(read, 'reading');
  return id;
}

export async function joinPublic(read: BuddyRead) {
  check(await supabase.rpc('join_public', { r: read.id }));
  await addToShelf(read, 'reading');
}

export async function leaveRead(readId: string) {
  const uid = await myUserId();
  check(await supabase.from('members').delete().eq('read_id', readId).eq('user_id', uid));
}

export async function setChapter(read: BuddyRead, chapter: number) {
  const uid = await myUserId();
  const value = Math.max(0, Math.min(read.chapters, Math.round(chapter)));
  check(
    await supabase.from('members').update({ chapter: value }).eq('read_id', read.id).eq('user_id', uid),
  );
  if (value >= read.chapters) {
    await addToShelf(read, 'done');
  }
  return value;
}

// ---------- Kapitel-Chat ----------

export async function chapterMessages(readId: string, chapter: number): Promise<Message[]> {
  return check(
    await supabase
      .from('messages')
      .select('*, reactions(user_id, emoji)')
      .eq('read_id', readId)
      .eq('chapter', chapter)
      .order('created_at', { ascending: true }),
  ) as Message[];
}

export async function messageCounts(readId: string): Promise<Record<number, number>> {
  const rows = check(
    await supabase.from('messages').select('chapter').eq('read_id', readId),
  ) as { chapter: number }[];
  const out: Record<number, number> = {};
  for (const r of rows) out[r.chapter] = (out[r.chapter] ?? 0) + 1;
  return out;
}

export async function sendMessage(readId: string, chapter: number, body: string) {
  check(await supabase.from('messages').insert({ read_id: readId, chapter, body: body.trim() }));
}

export async function toggleReaction(messageId: string, emoji: string, on: boolean) {
  const uid = await myUserId();
  if (on) {
    check(await supabase.from('reactions').insert({ message_id: messageId, emoji }));
  } else {
    check(
      await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', uid)
        .eq('emoji', emoji),
    );
  }
}

export async function reportMessage(msg: Message, reason = '') {
  check(
    await supabase
      .from('reports')
      .insert({ message_id: msg.id, reported_user: msg.user_id, reason }),
  );
}

// ---------- Blockieren ----------

export async function blockUser(userId: string) {
  check(await supabase.from('blocks').upsert({ blocked: userId }));
}

export async function unblockUser(userId: string) {
  const uid = await myUserId();
  check(await supabase.from('blocks').delete().eq('blocker', uid).eq('blocked', userId));
}

export async function blockedUsers(): Promise<{ blocked: string; profile: { name: string } | null }[]> {
  const uid = await myUserId();
  return check(
    await supabase
      .from('blocks')
      .select('blocked, profile:profiles!blocks_blocked_fkey(name)')
      .eq('blocker', uid),
  ) as unknown as { blocked: string; profile: { name: string } | null }[];
}

// ---------- Neuigkeiten ----------

export async function feed(): Promise<FeedEvent[]> {
  return check(
    await supabase
      .from('events')
      .select('*, profile:profiles(name, color), read:buddy_reads(title)')
      .order('created_at', { ascending: false })
      .limit(20),
  ) as FeedEvent[];
}

/** Tage in Folge mit Lesefortschritt (aus den eigenen Neuigkeiten berechnet). */
export async function myStreak(): Promise<number> {
  const uid = await myUserId();
  const rows = check(
    await supabase
      .from('events')
      .select('created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(400),
  ) as { created_at: string }[];
  const days = new Set(rows.map((r) => new Date(r.created_at).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ---------- Regal ----------

export async function shelf(): Promise<ShelfBook[]> {
  const uid = await myUserId();
  return check(
    await supabase
      .from('shelf')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
  ) as ShelfBook[];
}

export async function addToShelf(
  book: { title: string; author: string; cover_url: string | null },
  status: ShelfStatus,
) {
  const uid = await myUserId();
  check(
    await supabase.from('shelf').upsert(
      {
        user_id: uid,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        status,
        finished_at: status === 'done' ? new Date().toISOString().slice(0, 10) : null,
      },
      { onConflict: 'user_id,title' },
    ),
  );
}

export async function updateShelfBook(id: string, patch: Partial<Omit<ShelfBook, 'id'>>) {
  check(await supabase.from('shelf').update(patch).eq('id', id));
}

export async function removeShelfBook(id: string) {
  check(await supabase.from('shelf').delete().eq('id', id));
}

// ---------- Büchersuche (Open Library, frei und ohne Schlüssel) ----------

export type BookHit = {
  key: string;
  title: string;
  author: string;
  pages: number | null;
  cover_url: string | null;
};

export async function searchBooks(q: string): Promise<BookHit[]> {
  const url =
    'https://openlibrary.org/search.json?limit=12&fields=key,title,author_name,cover_i,number_of_pages_median&q=' +
    encodeURIComponent(q);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Die Büchersuche antwortet gerade nicht.');
  const json = (await res.json()) as {
    docs: { key: string; title: string; author_name?: string[]; cover_i?: number; number_of_pages_median?: number }[];
  };
  return json.docs.map((d) => ({
    key: d.key,
    title: d.title,
    author: d.author_name?.[0] ?? '',
    pages: d.number_of_pages_median ?? null,
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
  }));
}

// ---------- Umrechnung Seite / Prozent → Kapitel ----------

/** Rechnet Seite oder Prozent in "beendete Kapitel" um (gleich lange Kapitel angenommen). */
export function toChapter(read: Pick<BuddyRead, 'chapters' | 'pages'>, mode: 'page' | 'percent', value: number) {
  const share = mode === 'page' ? value / read.pages : value / 100;
  return Math.max(0, Math.min(read.chapters, Math.floor(share * read.chapters + 1e-9)));
}
