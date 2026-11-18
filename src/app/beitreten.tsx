import { router } from 'expo-router';
import { useState } from 'react';

import { Field } from '../components/Field';
import { Button, ErrorNote, Screen, T } from '../components/ui';
import { joinByCode } from '../lib/api';
import { errorText } from '../lib/supabase';

export default function Join() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (code.trim().length < 4) return setError('Der Code hat 6 Zeichen, z. B. K7Q2AB.');
    setBusy(true);
    setError(null);
    try {
      const id = await joinByCode(code);
      router.replace(`/read/${id}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom']} contentStyle={{ gap: 14, paddingTop: 8 }}>
      <T v="muted">Eine Freundin hat dir einen Code geschickt? Gib ihn hier ein, dann bist du direkt im Buddy Read.</T>
      <Field
        label="Einladungscode"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
        placeholder="K7Q2AB"
        style={{ fontSize: 22, letterSpacing: 4, textAlign: 'center' }}
        onSubmitEditing={join}
      />
      {error && <ErrorNote text={error} />}
      <Button title="Beitreten" onPress={join} loading={busy} />
    </Screen>
  );
}
