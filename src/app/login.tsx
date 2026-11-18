import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Field } from '../components/Field';

import { Button, ErrorNote, Screen, Segmented, T } from '../components/ui';
import { useAuth } from '../lib/auth';
import { errorText, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function Login() {
  const { session } = useAuth();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  async function submit() {
    setError(null);
    setInfo(null);
    if (mode === 'signup' && !name.trim()) return setError('Wie sollen dich die anderen sehen? Gib einen Namen ein.');
    if (!email.includes('@')) return setError('Gib eine gültige E-Mail-Adresse ein.');
    if (password.length < 6) return setError('Das Passwort braucht mindestens 6 Zeichen.');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (e) throw e;
        if (!data.session) {
          setInfo('Fast geschafft! Wir haben dir eine E-Mail geschickt. Bestätige sie und melde dich dann hier an.');
          setMode('login');
        }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ paddingTop: 24, gap: 16 }}>
        <T v="h1">{mode === 'signup' ? 'Willkommen, Book Girlie!' : 'Schön, dass du wieder da bist'}</T>
        <T v="muted">
          {mode === 'signup'
            ? 'Leg dein Konto an. Danach kannst du Buddy Reads starten oder Freundinnen beitreten.'
            : 'Melde dich mit deiner E-Mail an.'}
        </T>
        <Segmented
          options={[
            ['signup', 'Neu hier'],
            ['login', 'Anmelden'],
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === 'signup' && (
          <Field label="Dein Name" value={name} onChangeText={setName} placeholder="z. B. Jenny" autoCapitalize="words" />
        )}
        <Field
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          placeholder="du@beispiel.de"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          placeholder="mindestens 6 Zeichen"
          secureTextEntry
          autoCapitalize="none"
        />
        {error && <ErrorNote text={error} />}
        {info && (
          <View style={styles.info}>
            <T>{info}</T>
          </View>
        )}
        <Button title={mode === 'signup' ? 'Konto anlegen' : 'Anmelden'} onPress={submit} loading={busy} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  info: { backgroundColor: colors.sageSoft, borderRadius: 12, padding: 12 },
});
