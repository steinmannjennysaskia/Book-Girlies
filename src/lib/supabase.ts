import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isConfigured = url.startsWith('https://') && anonKey.length > 20;

export const supabase = createClient(
  isConfigured ? url : 'https://example.supabase.co',
  isConfigured ? anonKey : 'missing-key',
  {
    auth: {
      storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Token nur auffrischen, solange die App im Vordergrund ist.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Macht aus Supabase-Fehlern einen Satz, den man versteht. */
export function errorText(error: unknown): string {
  const msg = (error as { message?: string })?.message ?? String(error);
  if (/Invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/Email not confirmed/i.test(msg)) return 'Bitte bestätige zuerst deine E-Mail. Schau in dein Postfach.';
  if (/already registered/i.test(msg)) return 'Mit dieser E-Mail gibt es schon ein Konto. Melde dich an.';
  if (/Password should be/i.test(msg)) return 'Das Passwort braucht mindestens 6 Zeichen.';
  if (/Network request failed|Failed to fetch/i.test(msg)) return 'Keine Verbindung. Prüfe dein Internet.';
  return msg;
}
