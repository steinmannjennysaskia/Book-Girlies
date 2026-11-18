import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Die URL und der "anon" Key sind öffentlich (sie stecken in jeder App-Kopie).
// Die Daten schützen die Sicherheitsregeln in der Datenbank. Mit einer .env-Datei
// kann man auf ein anderes Supabase-Projekt umstellen.
const DEFAULT_URL = 'https://znmvawckgybuwhwloxmz.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXZhd2NrZ3lidXdod2xveG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMjYzNDAsImV4cCI6MjExMDYwMjM0MH0.RAHr8kdQuuCXj1A6Dlb8XGNXqlj4i0M-C1_Oz9nmA2E';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

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
