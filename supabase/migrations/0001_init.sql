-- Book Girlies: Datenbank, Spoilerschutz und Sicherheitsregeln
-- Einmal im Supabase SQL Editor ausführen (oder mit `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Leserin' check (char_length(name) between 1 and 30),
  color text not null default '#b8582f',
  tropes text[] not null default '{}',
  yearly_goal int not null default 24 check (yearly_goal between 1 and 365),
  created_at timestamptz not null default now()
);

create table public.buddy_reads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  author text not null default '',
  cover_url text,
  chapters int not null check (chapters between 1 and 500),
  pages int not null check (pages between 1 and 10000),
  is_public boolean not null default false,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid not null references public.profiles on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.members (
  read_id uuid not null references public.buddy_reads on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  chapter int not null default 0 check (chapter >= 0),
  joined_at timestamptz not null default now(),
  primary key (read_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  read_id uuid not null references public.buddy_reads on delete cascade,
  chapter int not null check (chapter >= 1),
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.messages (read_id, chapter, created_at);

create table public.reactions (
  message_id uuid not null references public.messages on delete cascade,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  emoji text not null check (emoji in ('🔥', '😭', '😍', '😱')),
  primary key (message_id, user_id, emoji)
);

create table public.blocks (
  blocker uuid not null references public.profiles on delete cascade default auth.uid(),
  blocked uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages on delete set null,
  reported_user uuid references public.profiles on delete set null,
  reporter uuid not null references public.profiles on delete cascade default auth.uid(),
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  read_id uuid not null references public.buddy_reads on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  chapter int not null,
  finished boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.events (read_id, created_at desc);

create table public.shelf (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  title text not null,
  author text not null default '',
  cover_url text,
  status text not null default 'want' check (status in ('reading', 'done', 'want')),
  rating int check (rating between 1 and 5),
  tags text[] not null default '{}',
  finished_at date,
  created_at timestamptz not null default now(),
  unique (user_id, title)
);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen (security definer, damit die Regeln sich nicht im Kreis drehen)
-- ---------------------------------------------------------------------------

create or replace function public.is_member(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where read_id = r and user_id = auth.uid());
$$;

create or replace function public.my_chapter(r uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select chapter from members where read_id = r and user_id = auth.uid()), -1);
$$;

create or replace function public.is_blocked_between(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker = auth.uid() and blocked = other) or (blocker = other and blocked = auth.uid())
  );
$$;

-- Profil automatisch anlegen, wenn sich jemand registriert
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  palette text[] := array['#b8582f', '#6f8f72', '#c48a2c', '#8a5a7a', '#4f7a8f', '#a8584f'];
begin
  insert into profiles (id, name, color)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'Leserin'),
    palette[1 + floor(random() * array_length(palette, 1))::int]
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Wer einen Buddy Read startet, ist automatisch dabei
create or replace function public.add_creator_as_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into members (read_id, user_id) values (new.id, new.created_by);
  return new;
end $$;

create trigger on_buddy_read_created
  after insert on public.buddy_reads
  for each row execute function public.add_creator_as_member();

-- Öffentliche Buddy Reads: höchstens 6 Personen
create or replace function public.enforce_public_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select is_public from buddy_reads where id = new.read_id)
     and (select count(*) from members where read_id = new.read_id) >= 6 then
    raise exception 'Dieser Buddy Read ist voll (6 von 6).' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger members_public_limit
  before insert on public.members
  for each row execute function public.enforce_public_limit();

-- Fortschritt erzeugt einen Eintrag für die Neuigkeiten
create or replace function public.log_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare total int;
begin
  if new.chapter > old.chapter then
    select chapters into total from buddy_reads where id = new.read_id;
    insert into events (read_id, user_id, chapter, finished)
    values (new.read_id, new.user_id, new.chapter, new.chapter >= total);
  end if;
  return new;
end $$;

create trigger members_progress
  after update of chapter on public.members
  for each row execute function public.log_progress();

-- Kapitel darf nicht über die Kapitelzahl hinaus gehen
create or replace function public.clamp_chapter() returns trigger
language plpgsql security definer set search_path = public as $$
declare total int;
begin
  select chapters into total from buddy_reads where id = new.read_id;
  new.chapter := least(greatest(new.chapter, 0), total);
  return new;
end $$;

create trigger members_clamp
  before insert or update of chapter on public.members
  for each row execute function public.clamp_chapter();

-- Buddy Read starten (gibt die neue id zurück)
create or replace function public.create_read(
  p_title text, p_author text, p_cover_url text, p_chapters int, p_pages int, p_is_public boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  if auth.uid() is null then
    raise exception 'Bitte melde dich an.' using errcode = 'P0001';
  end if;
  insert into buddy_reads (title, author, cover_url, chapters, pages, is_public, created_by)
  values (trim(p_title), coalesce(trim(p_author), ''), p_cover_url, p_chapters, p_pages, p_is_public, auth.uid())
  returning id into r;
  return r;
end $$;

-- Mit Einladungscode einem (auch privaten) Buddy Read beitreten
create or replace function public.join_by_code(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  select id into r from buddy_reads where invite_code = upper(trim(code));
  if r is null then
    raise exception 'Diesen Code gibt es nicht. Prüfe ihn bitte noch einmal.' using errcode = 'P0001';
  end if;
  insert into members (read_id, user_id) values (r, auth.uid()) on conflict do nothing;
  return r;
end $$;

-- Einem öffentlichen Buddy Read beitreten
create or replace function public.join_public(r uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from buddy_reads where id = r and is_public) then
    raise exception 'Dieser Buddy Read ist nicht öffentlich.' using errcode = 'P0001';
  end if;
  insert into members (read_id, user_id) values (r, auth.uid()) on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- Sicherheitsregeln (Row Level Security)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.buddy_reads enable row level security;
alter table public.members enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.events enable row level security;
alter table public.shelf enable row level security;

-- Profile: Namen sind für angemeldete Leserinnen sichtbar, ändern nur das eigene
create policy "profiles lesen" on public.profiles for select to authenticated using (true);
create policy "eigenes profil ändern" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Buddy Reads: öffentliche sieht jede, private nur Mitglieder
create policy "buddy reads lesen" on public.buddy_reads for select to authenticated
  using (is_public or public.is_member(id));
create policy "buddy read starten" on public.buddy_reads for insert to authenticated
  with check (created_by = auth.uid());
create policy "eigenen buddy read ändern" on public.buddy_reads for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- Mitglieder: sichtbar für Mitglieder und bei öffentlichen Runden
create policy "mitglieder lesen" on public.members for select to authenticated
  using (public.is_member(read_id)
         or exists (select 1 from buddy_reads b where b.id = read_id and b.is_public));
create policy "eigenen fortschritt ändern" on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "buddy read verlassen" on public.members for delete to authenticated
  using (user_id = auth.uid());
-- Beitreten läuft über join_by_code / join_public

-- Nachrichten: der Spoilerschutz.
-- Man sieht den Chat zu Kapitel N erst, wenn man selbst Kapitel N beendet hat.
create policy "kapitel-chat lesen" on public.messages for select to authenticated
  using (public.my_chapter(read_id) >= chapter and not public.is_blocked_between(user_id));
create policy "kapitel-chat schreiben" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.my_chapter(read_id) >= chapter);
create policy "eigene nachricht löschen" on public.messages for delete to authenticated
  using (user_id = auth.uid());

-- Reaktionen
create policy "reaktionen lesen" on public.reactions for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id));
create policy "reagieren" on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from messages m where m.id = message_id));
create policy "reaktion entfernen" on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- Blockieren und Melden
create policy "eigene blockierungen" on public.blocks for all to authenticated
  using (blocker = auth.uid()) with check (blocker = auth.uid());
create policy "melden" on public.reports for insert to authenticated
  with check (reporter = auth.uid());

-- Neuigkeiten aus den eigenen Buddy Reads
create policy "neuigkeiten lesen" on public.events for select to authenticated
  using (public.is_member(read_id) and not public.is_blocked_between(user_id));

-- Regal: nur das eigene
create policy "eigenes regal" on public.shelf for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live-Updates für Chat, Fortschritt und Reaktionen
alter publication supabase_realtime add table public.messages, public.members, public.reactions;
