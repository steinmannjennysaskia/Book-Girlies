-- Book Girlies: Funktionen absichern (Hinweise aus dem Supabase Security Advisor)
-- Trigger-Funktionen soll niemand direkt per API aufrufen.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.add_creator_as_member() from public, anon, authenticated;
revoke execute on function public.enforce_public_limit() from public, anon, authenticated;
revoke execute on function public.log_progress() from public, anon, authenticated;
revoke execute on function public.clamp_chapter() from public, anon, authenticated;

-- App-Funktionen und Helfer für die Sicherheitsregeln: nur für angemeldete Leserinnen.
revoke execute on function public.create_read(text, text, text, int, int, boolean) from public, anon;
revoke execute on function public.join_by_code(text) from public, anon;
revoke execute on function public.join_public(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.my_chapter(uuid) from public, anon;
revoke execute on function public.is_blocked_between(uuid) from public, anon;
grant execute on function public.create_read(text, text, text, int, int, boolean) to authenticated;
grant execute on function public.join_by_code(text) to authenticated;
grant execute on function public.join_public(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.my_chapter(uuid) to authenticated;
grant execute on function public.is_blocked_between(uuid) to authenticated;
