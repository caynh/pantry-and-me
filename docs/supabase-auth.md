# Supabase auth setup

pantry&me opens on a **welcome / sign-in screen** the first time. From there the
user can sign in with Apple, Google, or email, or continue without an account
(anonymous). Anonymous pantry data is stored under that user's UID so it can be
linked or merged later.

Without Supabase keys, the welcome screen offers a single Continue button and the
app stays on device storage.

This is an Expo / React Native app. The welcome screen lives in
`apps/mobile/app/welcome.tsx` (not a Swift `WelcomeView`). Auth lives in
`apps/mobile/hooks/useAuth.tsx`.

## 1. Enable providers

In the [Supabase dashboard](https://supabase.com/dashboard) for your project:

### Anonymous

Authentication → Providers → **Anonymous Sign-Ins** → On

### Email

Authentication → Providers → **Email** → On

For local testing, turn **Confirm email** **off**. With confirmation on, linking
an email sends a mail the user must open before `signInWithPassword` works.

### Apple

Authentication → Providers → **Apple** → On

You will need an Apple Services ID / key from
[developer.apple.com](https://developer.apple.com/). Supabase's Apple provider
docs walk through Client IDs and the secret key:
https://supabase.com/docs/guides/auth/social-login/auth-apple

### Google — who sets this up

You (the developer) set this up in two places. The end user does not.

1. **Google Cloud Console** (https://console.cloud.google.com/)
   - Create or pick a project.
   - APIs & Services → OAuth consent screen → External, add your app name.
   - APIs & Services → Credentials → Create credentials → OAuth client ID →
     **Web application**.
   - Authorized redirect URI:
     `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client secret**.

2. **Supabase dashboard**
   - Authentication → Providers → **Google** → On
   - Paste the Web Client ID and Client secret from step 1.

3. **Redirect allow-list in Supabase**
   - Authentication → URL Configuration → Redirect URLs, add:
     - `pantryandme://auth`
     - `exp://127.0.0.1:8081` (Expo Go / simulator, optional)

No native Google SDK is required. The app opens Google through Supabase Auth
(`signInWithOAuth` / `linkIdentity`) and `expo-web-browser`.

If you later want the native Google button sheet, that is a separate Expo
development-build step with `@react-native-google-signin/google-signin`. The
Web client above is still what Supabase verifies.

### Manual linking (required for claiming an anonymous pantry)

Authentication → Providers (or Settings) → **Enable manual linking** → On

That lets Apple / Google / email attach to the current anonymous UID instead of
creating a second account. It is the Supabase equivalent of Firebase
`linkWithCredential()`.

### App / Expo

`apps/mobile/app.json` already has `"usesAppleSignIn": true` and the
`expo-apple-authentication` plugin. A **development build** or TestFlight build
is required for Apple Sign In on device. Email and Google work in Expo Go.

The Apple control is `AppleAuthenticationButton` (Apple's
`ASAuthorizationAppleIDButton`). Do not replace it with a custom black button.

## 2. Run the database schema

SQL Editor → paste and run, in order:

1. `supabase/migrations/20260808180000_initial_schema.sql`
2. `supabase/migrations/20260910223000_saved_recipes_and_pref_columns.sql`

The first creates tables, RLS, and a trigger so every new auth user (including
anonymous) gets a profile row. The second adds `saved_recipes` and reminder
columns on `user_preferences` so recipes and filters are stored under the UID.

## 3. Copy project keys

Project Settings → API → **Project URL** and **anon public** key into
`apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Never put the **service_role** key in the mobile app.

## 4. Restart Expo

```bash
npm run mobile
```

## 5. Confirm it worked

| Check | Where |
|-------|--------|
| Anonymous session | Settings → Account: "Anonymous account, synced to the cloud" |
| Cloud writes | Add an ingredient → Table Editor → `ingredients` |
| Save with email | Settings → Save this pantry → email + password → Account shows the email |
| Sign in elsewhere | Other device/simulator → Sign in to existing → merge prompt if this device had items |
| Apple (iOS build) | Sign in with Apple → Account becomes identified |
| Google | Sign in with Google → Account becomes identified |

## How the flows map to code

| User action | Supabase call | Keeps current pantry? |
|-------------|---------------|------------------------|
| Continue without an account | `signInAnonymously()` | New empty cloud pantry (or restored session) |
| Save this pantry (email) | `updateUser({ email, password })` | **Yes** — same `user_id` |
| Apple / Google on an anonymous session | `linkIdentity()` | **Yes** — same `user_id` when the identity is new |
| Identity already belongs to another account | Prompt, then merge or switch | Merge copies ingredients (deduped by name), recipes (by URL), and unions preferences |
| Sign in while signed out | `signInWithPassword` / `signInWithIdToken` / OAuth | Loads that account |
| Sign out | `signOut()` | Account in the cloud is untouched |

A pending merge snapshot is written to AsyncStorage *before* any session swap
(`lib/pantry-migration.ts`). If the app is backgrounded mid-merge, launch
resumes the same snapshot. The anonymous session is not signed out until the
destination session is confirmed.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Anonymous sign-ins are turned off..." | Enable Anonymous provider |
| "Confirm your email..." | Turn off Confirm email for testing, or open the link |
| "Wrong email or password" | Use Save this pantry first on some device |
| Apple button missing | iOS only; `AppleAuthentication.isAvailableAsync()` is false on most simulators/web |
| Apple / Google create a second empty user | Enable Manual Linking |
| Google sheet fails to return | Add `pantryandme://auth` to Supabase Redirect URLs; confirm the Web client redirect is the Supabase callback |
| Ingredients stay on device with keys set | Account card will show the auth error — fix that first |
| Saved recipes stay local | Run the second SQL migration |

## Not built yet

- Account deletion UI (required before App Store if you store personal data)
- Password reset email flow
- Shared household pantries
