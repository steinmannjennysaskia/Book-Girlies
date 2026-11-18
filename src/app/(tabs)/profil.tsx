import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Field } from '../../components/Field';
import { Avatar, Button, Card, Chip, Empty, Screen, Section, Sheet, T } from '../../components/ui';
import { blockedUsers, unblockUser, updateProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, GENRES } from '../../lib/theme';
import { useLoad } from '../../lib/useAsync';

export default function Profile() {
  const { session, profile, refreshProfile } = useAuth();
  const blocked = useLoad(blockedUsers);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [goal, setGoal] = useState(profile?.yearly_goal ?? 24);

  useEffect(() => {
    setName(profile?.name ?? '');
    setGoal(profile?.yearly_goal ?? 24);
  }, [profile]);

  if (!profile || !session) return <Screen><Empty text="Profil wird geladen …" /></Screen>;

  async function save(p: Parameters<typeof updateProfile>[1]) {
    await updateProfile(profile!.id, p).catch(() => {});
    refreshProfile();
  }

  function changeGoal(d: number) {
    const next = Math.min(365, Math.max(1, goal + d));
    setGoal(next);
    save({ yearly_goal: next });
  }

  return (
    <Screen contentStyle={{ paddingTop: 14 }}>
      <View style={styles.top}>
        <Avatar name={profile.name} color={profile.color} size={64} />
        <View style={{ flex: 1 }}>
          <T v="h1">{profile.name}</T>
          <T v="muted">{session.user.email}</T>
        </View>
        <Pressable onPress={() => setEditing(true)} style={styles.edit} accessibilityLabel="Name ändern">
          <T>✎</T>
        </Pressable>
      </View>

      <Section title="Lieblings-Genres">
        <View style={styles.chips}>
          {GENRES.map((g) => (
            <Chip
              key={g}
              label={g}
              on={profile.tropes.includes(g)}
              onPress={() =>
                save({ tropes: profile.tropes.includes(g) ? profile.tropes.filter((x) => x !== g) : [...profile.tropes, g] })
              }
            />
          ))}
        </View>
      </Section>

      <Section title="Jahresziel">
        <Card style={styles.goal}>
          <Pressable style={styles.step} onPress={() => changeGoal(-1)}>
            <T v="h2">−</T>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T v="h1">{goal}</T>
            <T v="muted">Bücher pro Jahr</T>
          </View>
          <Pressable style={styles.step} onPress={() => changeGoal(1)}>
            <T v="h2">+</T>
          </Pressable>
        </Card>
      </Section>

      <Section title="Blockiert">
        <Card style={{ padding: 0 }}>
          {blocked.data?.length ? (
            blocked.data.map((b, i) => (
              <View key={b.blocked} style={[styles.row, i > 0 && styles.rowBorder]}>
                <T style={{ flex: 1 }}>{b.profile?.name ?? 'Unbekannt'}</T>
                <Chip
                  label="Freigeben"
                  onPress={async () => {
                    await unblockUser(b.blocked).catch(() => {});
                    blocked.reload();
                  }}
                />
              </View>
            ))
          ) : (
            <Empty text="Niemand. So soll es sein." />
          )}
        </Card>
      </Section>

      <Section title="Konto">
        <Button title="Abmelden" kind="ghost" onPress={() => supabase.auth.signOut()} />
      </Section>

      <Sheet visible={editing} onClose={() => setEditing(false)}>
        <T v="h2">Dein Name</T>
        <Field label="So sehen dich die anderen" value={name} onChangeText={setName} maxLength={30} />
        <Button
          title="Speichern"
          onPress={async () => {
            if (name.trim()) await save({ name: name.trim() });
            setEditing(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  edit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
});
