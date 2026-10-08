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
`ASAuthorizationAppleIDButton`) on the welcome screen, the sign-up screen, and
Settings. Do not replace it with a custom black button. The app sends a SHA-256
nonce with the Apple identity token so Supabase can verify it.

Sign in with Apple has to be offered wherever Google sign-in is offered. It
only appears on iOS, and only in a development or TestFlight build — Expo Go
cannot present it. On a simulator it stays hidden until that simulator is
signed into an Apple ID.

Before review, confirm all of the following, then sign in on a real iPhone:

1. Apple provider enabled in Supabase, with the Services ID, team ID, key ID,
   and private key from Apple Developer.
2. Manual linking enabled.
3. The iOS build includes the Sign in with Apple capability (`usesAppleSignIn`
   in `app.json` turns this on at prebuild).
4. Welcome, Sign up, and Settings (while anonymous) show Apple's button above
   Google and email.

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
| Delete account | `POST /api/account` with the user JWT, then local sign-out | Account, pantry, and Sign in with Apple token are removed |

A pending merge snapshot is written to AsyncStorage *before* any session swap
(`lib/pantry-migration.ts`). If the app is backgrounded mid-merge, launch
resumes the same snapshot. The anonymous session is not signed out until the
destination session is confirmed.

## Account deletion

Settings → Account → **Delete account** calls `POST /api/account`. The API
checks the user's access token, then deletes that user with the Supabase
**service role** key. Deleting the auth user cascades to `profiles`,
`ingredients`, `user_preferences`, and `saved_recipes`. Supabase also revokes
the Sign in with Apple refresh token when the Apple provider is configured.

Add these to `apps/api/.env.local` (never to the mobile app):

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Restart the API after saving them. A review build whose API is missing the
service role key will show "Account deletion is unavailable right now."

## Privacy policy

The policy is a page on the API: `/privacy`. Put that public HTTPS URL in App
Store Connect, and set the same value as `EXPO_PUBLIC_PRIVACY_POLICY_URL` in
`apps/mobile/.env` so the in-app link matches. Set `PRIVACY_CONTACT_EMAIL` on
the API so the page includes a real contact address.

After sign-in, including Continue without an account, the app opens the policy and stays there until the agreement box is checked. Settings can open the same policy again later. The hosted page is still the URL for App Store Connect. Signing out clears the agreement, so the next sign-in asks again.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Anonymous sign-ins are turned off..." | Enable Anonymous provider |
| "Confirm your email..." | Turn off Confirm email for testing, or open the link |
| "Wrong email or password" | Use Save this pantry first on some device |
| Apple button missing | iOS only; `AppleAuthentication.isAvailableAsync()` is false on most simulators/web |
| Apple sign-in fails immediately on device | Confirm the Apple provider secret in Supabase, and that the bundle ID is an allowed client ID |
| Apple / Google create a second empty user | Enable Manual Linking |
| Google sheet fails to return | Add `pantryandme://auth` to Supabase Redirect URLs; confirm the Web client redirect is the Supabase callback |
| Delete account says it is unavailable | Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `apps/api/.env.local` and restart the API |
| Ingredients stay on device with keys set | Account card will show the auth error — fix that first |
| Saved recipes stay local | Run the second SQL migration |

## Not built yet

- Password reset email flow
- Shared household pantries
