# Play Store Deployment Playbook

> One-shot guide to take a React + Vite + TypeScript web game → signed Android AAB on Google Play Store.
> Hand this file to Claude in your project and say: **"Follow this playbook to publish my game on Google Play Store."**

---

## Step 0: Info Gathering

Before starting, I need the following from you:

| Item | Example (Seep) |
|------|----------------|
| App name | `Seep - Indian Card Game` |
| Package name | `in.xuresolutions.seep` |
| Production server URL | `https://seep.xuresolutions.in` |
| Game category | Card Game |
| Developer name | Xure Solutions |
| Developer email | `praveen@xuresolutions.in` |
| Firebase `google-services.json` path | `docs/config/google-services.json` |
| Firebase web config (apiKey, authDomain, projectId, appId, measurementId) | *(from Firebase Console → Project Settings → Web app)* |
| Keystore password for signing | *(user provides)* |

Also confirm these are installed:
- **JDK 21** — path: `C:\Users\Praveen\.jdks\jbr-21.0.8`
- **Android SDK** — path: `C:\Users\Praveen\Android\Sdk`

---

## Step 1: Capacitor Setup

### 1.1 Install dependencies
```bash
cd client
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 1.2 Create `client/capacitor.config.ts`
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '<PACKAGE_NAME>',        // e.g. 'in.xuresolutions.seep'
  appName: '<APP_DISPLAY_NAME>',  // e.g. 'Seep'
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

### 1.3 Add npm scripts to `client/package.json`
```json
{
  "scripts": {
    "cap:sync": "npx cap sync android",
    "cap:open": "npx cap open android",
    "cap:build": "tsc && vite build --mode native && npx cap sync android"
  }
}
```

### 1.4 Add Android platform
```bash
cd client
npx cap add android
```

### 1.5 Copy Firebase config
```bash
cp docs/config/google-services.json client/android/app/google-services.json
```

---

## Step 2: Firebase Analytics

### 2.1 Install analytics packages
```bash
cd client
npm install @capacitor-firebase/analytics firebase
```

### 2.2 Create `client/src/services/analytics.ts`
```ts
import { Capacitor } from '@capacitor/core';

type FirebaseAnalyticsType = typeof import('@capacitor-firebase/analytics').FirebaseAnalytics;
type WebAnalytics = import('firebase/analytics').Analytics;

let nativeAnalytics: FirebaseAnalyticsType | null = null;
let webAnalytics: WebAnalytics | null = null;
let initialized = false;

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics');
      nativeAnalytics = FirebaseAnalytics;
      await FirebaseAnalytics.setEnabled({ enabled: true });
    } else {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      if (!apiKey) return;

      const { initializeApp } = await import('firebase/app');
      const { getAnalytics } = await import('firebase/analytics');

      const app = initializeApp({
        apiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
      });
      webAnalytics = getAnalytics(app);
    }
  } catch (e) {
    console.warn('Analytics init failed:', e);
  }
}

export async function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    if (nativeAnalytics) {
      await nativeAnalytics.logEvent({ name, params: params ?? {} });
    } else if (webAnalytics) {
      const { logEvent: fbLogEvent } = await import('firebase/analytics');
      fbLogEvent(webAnalytics, name, params);
    }
  } catch (e) {
    console.warn('Analytics logEvent failed:', e);
  }
}

export async function setUserId(id: string): Promise<void> {
  try {
    if (nativeAnalytics) {
      await nativeAnalytics.setUserId({ userId: id });
    } else if (webAnalytics) {
      const { setUserId: fbSetUserId } = await import('firebase/analytics');
      fbSetUserId(webAnalytics, id);
    }
  } catch (e) {
    console.warn('Analytics setUserId failed:', e);
  }
}
```

### 2.3 Initialize in `main.tsx`
Add before `ReactDOM.createRoot(...)`:
```ts
import { initAnalytics } from './services/analytics';
initAnalytics(); // fire-and-forget
```

### 2.4 Add game events
In your main game hook/component, add calls like:
```ts
import { logEvent, setUserId } from '../services/analytics';

// On game start
logEvent('game_start', { opponent: opponentName });
setUserId(playerId);

// On game end
logEvent('game_end', { game_number: gameNum });

// On match end
logEvent('match_end', { games_played: totalGames });
```

### 2.5 Create environment files

**`client/.env.native`** (for Android builds):
```
VITE_SERVER_URL=https://<PROD_DOMAIN>
VITE_PLATFORM=native
```

**`client/.env.production`** (for web builds with Firebase):
```
VITE_SERVER_URL=
VITE_PLATFORM=web
VITE_FIREBASE_API_KEY=<from firebase console>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project>
VITE_FIREBASE_APP_ID=<app-id>
VITE_FIREBASE_MEASUREMENT_ID=G-<id>
```

---

## Step 3: App Icon

### 3.1 Create `client/assets/icon.svg`
Design a 512x512 SVG with the game's theme (cards, game elements, app name text). Use dark background with game-colored accents.

### 3.2 Convert to PNG
```bash
npx sharp-cli -i client/assets/icon.svg -o client/assets/icon.png resize 1024 1024
npx sharp-cli -i client/assets/icon.svg -o client/assets/icon-512.png resize 512 512
```

### 3.3 Generate Android icon variants
```bash
cd client
npx @capacitor/assets generate --android
```
This reads `assets/icon.png` (1024x1024) and generates all mipmap densities + splash screens (74 files).

---

## Step 4: Feature Graphic

### 4.1 Create `client/assets/feature-graphic.svg`
Design a 1024x500 SVG — wide banner with game theme, title text centered, tagline below.

### 4.2 Convert to PNG
```bash
npx sharp-cli -i client/assets/feature-graphic.svg -o client/assets/feature-graphic.png resize 1024 500
```

---

## Step 5: Play Store Listing Content

Create `docs/PLAY_STORE_LISTING.md` with:

- **App name** (max 30 chars on store)
- **Short description** (max 80 chars)
- **Full description** (up to 4000 chars) — include: HOW TO PLAY, FEATURES, GAME RULES sections
- **Tags/keywords**
- **Category** and **content rating**
- **Data safety form answers** (see template below)

### Data Safety Template
| Question | Answer |
|----------|--------|
| Does your app collect or share user data? | Yes |
| Data type collected | App activity (app interactions), Device or other IDs |
| Is data collected, shared, or both? | Collected |
| Is data processed ephemerally? | No |
| Is this data collection required? | Yes (analytics) |
| Purpose | Analytics |
| Is data encrypted in transit? | Yes |
| Can users request data deletion? | Yes (via Firebase data deletion) |

---

## Step 6: Privacy Policy

### 6.1 Create `client/public/privacy-policy.html`
Styled HTML page covering:
- What data is collected (Firebase Analytics — anonymous usage data)
- What is NOT collected (no PII, no location, no photos)
- Display names (if multiplayer — stored in memory only, not persisted)
- How data is used (improve game, fix bugs)
- No data sharing with third parties
- Retention (14 months per Firebase defaults)
- Data deletion instructions
- Children's privacy (no PII collected from anyone)
- Contact email

### 6.2 Add server route
In `server/src/index.ts`:
```ts
app.get('/privacy-policy', (_req, res) => {
  res.sendFile(path.join(clientDist, 'privacy-policy.html'));
});
```

URL will be: `https://<DOMAIN>/privacy-policy`

---

## Step 7: Release Signing

### 7.1 Generate keystore
```bash
keytool -genkey -v \
  -keystore client/android/app/<app>-release.keystore \
  -alias <app> \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Xure Solutions, O=Xure Solutions, L=City, ST=State, C=IN"
```

### 7.2 Add signing config to `client/android/app/build.gradle`
Inside the `android { }` block, add:
```groovy
signingConfigs {
    release {
        storeFile file('<app>-release.keystore')
        storePassword System.getenv('KEYSTORE_PASSWORD') ?: ''
        keyAlias '<app>'
        keyPassword System.getenv('KEY_PASSWORD') ?: ''
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 7.3 Save passwords
Create `client/.env.keystore` (gitignored):
```
KEYSTORE_PASSWORD=<password>
KEY_PASSWORD=<password>
```

---

## Step 8: Gitignore Updates

Add to `.gitignore`:
```gitignore
# Android (Capacitor)
client/android/app/build/
client/android/.gradle/
client/android/build/
client/android/local.properties
client/android/app/google-services.json

# Capacitor native env
client/.env.native
client/.env.keystore

# Signing
*.keystore
*.jks
```

---

## Step 9: Build Signed AAB

```bash
# Set environment
export JAVA_HOME="/c/Users/Praveen/.jdks/jbr-21.0.8"
export ANDROID_HOME="/c/Users/Praveen/Android/Sdk"

# Load keystore passwords
export KEYSTORE_PASSWORD='<password>'
export KEY_PASSWORD='<password>'

# Build web → sync → build AAB
cd client && npm run cap:build
cd android && ./gradlew bundleRelease

# Copy to Downloads
cp client/android/app/build/outputs/bundle/release/app-release.aab ~/Downloads/<app>-release.aab
```

### For subsequent uploads
Bump `versionCode` in `client/android/app/build.gradle` before each new upload.

---

## Step 10: Play Store Upload Checklist

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app → fill app details
3. **Store listing**: paste content from `docs/PLAY_STORE_LISTING.md`
4. **Graphics**:
   - App icon: `client/assets/icon-512.png` (512x512)
   - Feature graphic: `client/assets/feature-graphic.png` (1024x500)
   - Screenshots: take from device/emulator (min 2, recommended 4-8)
5. **Content rating**: fill questionnaire (no violence, no user-generated content)
6. **Data safety**: fill using template from Step 5
7. **Privacy policy URL**: `https://<DOMAIN>/privacy-policy`
8. **Release**: Internal testing → upload AAB → promote to Production
9. **Target countries**: India, Pakistan, Nepal, Bangladesh, Sri Lanka, USA, UK, Canada, UAE, Singapore (adjust per game's audience)

---

## Quick Reference: Debug APK (for testing)

```bash
export JAVA_HOME="/c/Users/Praveen/.jdks/jbr-21.0.8"
export ANDROID_HOME="/c/Users/Praveen/Android/Sdk"
cd client && npm run cap:build
cd android && ./gradlew assembleDebug
cp client/android/app/build/outputs/apk/debug/app-debug.apk ~/Downloads/<app>-debug.apk
```

---

## Notes
- `vite build --mode native` uses `.env.native` (prod server URL, no Firebase web keys)
- `vite build --mode production` uses `.env.production` (Firebase web keys, no server URL)
- Socket.io connection: if `VITE_SERVER_URL` is empty, connects to same-origin (web). If set, connects to that URL (Android).
- The `analytics.ts` abstraction auto-detects native vs web — native uses `@capacitor-firebase/analytics` (reads `google-services.json`), web uses Firebase JS SDK (reads env vars).
- Always copy final `.aab`/`.apk` to `~/Downloads` after building.
