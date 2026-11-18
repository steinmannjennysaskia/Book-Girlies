import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Member } from '../lib/api';
import { colors, COVER_GRADIENTS, fonts } from '../lib/theme';

// ---------- Text ----------

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bold' | 'small' | 'eyebrow' | 'muted';

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[styles.text, textStyles[v], style]} />;
}

const textStyles: Record<Variant, TextStyle> = {
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31 },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26 },
  h3: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  body: {},
  bold: { fontFamily: fonts.bodyBold },
  small: { fontSize: 13, lineHeight: 18 },
  eyebrow: {
    fontFamily: fonts.bodyBlack,
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  muted: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
};

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <T v="h2">{title}</T>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Buttons & Chips ----------

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'sage' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    kind === 'primary' ? colors.rust : kind === 'sage' ? colors.sage : colors.paper;
  const fg = kind === 'ghost' ? colors.ink : kind === 'danger' ? colors.rust : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        (kind === 'ghost' || kind === 'danger') && styles.buttonGhost,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function LinkButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: [K, string][];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map(([k, label]) => (
        <Pressable key={k} onPress={() => onChange(k)} style={[styles.segBtn, value === k && styles.segOn]}>
          <Text style={[styles.segText, value === k && { color: colors.white }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Pill({ label, kind }: { label: string; kind: 'private' | 'public' }) {
  return (
    <View style={[styles.pill, { backgroundColor: kind === 'private' ? colors.sageSoft : colors.rustSoft }]}>
      <Text style={[styles.pillText, { color: kind === 'private' ? colors.sage : colors.rust }]}>{label}</Text>
    </View>
  );
}

// ---------- Bücher & Leserinnen ----------

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Cover({ title, url, size = 'md' }: { title: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? { width: 92, height: 138 } : size === 'sm' ? { width: 46, height: 69 } : { width: 62, height: 93 };
  const bg = COVER_GRADIENTS[hash(title) % COVER_GRADIENTS.length];
  return (
    <View style={[styles.cover, dims, { backgroundColor: bg }]}>
      {url ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Text numberOfLines={4} style={[styles.coverText, size === 'lg' && { fontSize: 14 }]}>
          {title}
        </Text>
      )}
    </View>
  );
}

export function Avatar({ name, color, size = 26, me }: { name: string; color: string; size?: number; me?: boolean }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        me && { borderColor: colors.rust },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.44 }]}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function Bar({ value, color = colors.sage }: { value: number; color?: string }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

/** Fortschrittsleiste der Gruppe: kleine Profilbilder auf einer Linie. */
export function GroupTrack({ members, chapters, me }: { members: Member[]; chapters: number; me?: string }) {
  const mine = members.find((m) => m.user_id === me);
  return (
    <View style={styles.track}>
      <View style={styles.trackRail} />
      {mine && <View style={[styles.trackFill, { width: `${(mine.chapter / chapters) * 100}%` }]} />}
      <View style={styles.trackInner}>
        {members.map((m) => (
          <View key={m.user_id} style={[styles.trackDot, { left: `${(m.chapter / chapters) * 100}%` }]}>
            <Avatar name={m.profile?.name ?? '?'} color={m.profile?.color ?? colors.muted} size={24} me={m.user_id === me} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Zustände ----------

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.rust} />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <T v="muted" style={styles.empty}>{text}</T>;
}

export function ErrorNote({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBox}>
      <T style={{ color: colors.rust }}>{text}</T>
      {onRetry && <LinkButton title="Nochmal versuchen" onPress={onRetry} />}
    </View>
  );
}

// ---------- Sheet (Modal von unten) ----------

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grip} />
            <View style={{ gap: 14 }}>{children}</View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { gap: 10, marginTop: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#54321E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  buttonGhost: { borderWidth: 1, borderColor: colors.line },
  buttonText: { fontFamily: fonts.bodyBlack, fontSize: 16 },
  link: { fontFamily: fonts.bodyBold, color: colors.rust, fontSize: 15 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink },
  seg: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  segOn: { backgroundColor: colors.rust },
  segText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.muted },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  pillText: { fontFamily: fonts.bodyBlack, fontSize: 11.5 },
  cover: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 7,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(0,0,0,0.18)',
  },
  coverText: { fontFamily: fonts.display, color: '#FFF8EF', fontSize: 10.5, lineHeight: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.paper },
  avatarText: { fontFamily: fonts.bodyBlack, color: colors.white },
  bar: { flex: 1, height: 8, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8 },
  track: { height: 30, marginTop: 4, justifyContent: 'center' },
  trackRail: { position: 'absolute', left: 12, right: 12, height: 5, borderRadius: 5, backgroundColor: colors.line },
  trackFill: { position: 'absolute', left: 12, height: 5, borderRadius: 5, backgroundColor: colors.sage, maxWidth: '100%' },
  trackInner: { position: 'absolute', left: 12, right: 12, top: 0, bottom: 0 },
  trackDot: { position: 'absolute', top: 3, marginLeft: -12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  empty: { textAlign: 'center', paddingVertical: 22 },
  errorBox: { backgroundColor: colors.rustSoft, borderRadius: 12, padding: 12, gap: 6 },
  scrim: { flex: 1, backgroundColor: 'rgba(30,18,12,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: '90%',
  },
  grip: { width: 40, height: 5, borderRadius: 5, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 12 },
});
