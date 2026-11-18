# Book Girlies

Eine Handy-App (iPhone und Android) zum gemeinsamen Lesen: Buddy Reads mit spoilerfreien Kapitel-Chats, Fortschritt nach Kapitel, Seite oder Prozent, und ein eigenes Regal.

## Was die App kann

- **Konto** mit E-Mail und Passwort
- **Buddy Read starten**: Buch über Open Library suchen, Kapitel und Seiten eintragen, privat oder öffentlich
- **Einladen** per Code (teilen oder kopieren), **beitreten** mit Code
- **Öffentliche Buddy Reads** entdecken und beitreten, höchstens 6 Personen pro Runde
- **Fortschritt** nach Kapitel, Seite oder Prozent. Seite und Prozent werden ins Kapitel umgerechnet.
- **Fortschrittsleiste der Gruppe** und Neuigkeiten („Lena hat Kapitel 12 beendet 🔥“), live aktualisiert
- **Spoilerfreier Kapitel-Chat**: Den Chat zu Kapitel N sieht nur, wer Kapitel N beendet hat. Das prüft die Datenbank selbst, nicht nur die App.
- **Reaktionen** 🔥 😭 😍 😱, **melden** und **blockieren**
- **Regal**: lese gerade, gelesen, will ich lesen, mit Bewertung und Mood-Tags; Jahresziel und Lese-Streak

## Technik

- [Expo](https://expo.dev) (React Native) mit Expo Router, Code in `src/`
- [Supabase](https://supabase.com) für Konten, Datenbank und Live-Chat. Datenbank und Sicherheitsregeln stehen in `supabase/migrations/0001_init.sql`.

## Einrichten

### 1. Supabase (kostenlos)

1. Auf [supabase.com](https://supabase.com) ein Konto und ein neues Projekt anlegen (Region z. B. Frankfurt).
2. Im Projekt links auf **SQL Editor**, den ganzen Inhalt von `supabase/migrations/0001_init.sql` einfügen und **Run** drücken.
3. Unter **Project Settings → API** die **Project URL** und den **anon public** Key kopieren.
4. Optional zum Testen: unter **Authentication → Sign In / Providers → Email** „Confirm email“ ausschalten, dann muss man die E-Mail nicht bestätigen.

### 2. App starten

```bash
npm install
cp .env.example .env   # dann die zwei Werte aus Supabase eintragen
npx expo start
```

Auf dem Handy die App **Expo Go** installieren (App Store oder Google Play) und den QR-Code aus dem Terminal scannen.

### 3. Prüfen

```bash
npm run typecheck
```

## Später

Streak-Erinnerungen, Monatsrückblick zum Teilen, Lieblingszitate, Trope-Matching und Push-Benachrichtigungen. Für den App Store und Google Play wird die App mit `npx eas-cli build` gebaut.
