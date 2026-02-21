# MB3 Intake — Deploy in 15 Minutes

## Step 1 — Firebase Setup (8 min)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `mb3-intake` → disable Google Analytics → Create
3. In the left sidebar: **Build → Realtime Database**
4. Click **"Create Database"** → choose **United States** → start in **test mode** → Enable
5. In the left sidebar: **Project Settings** (gear icon) → scroll to **"Your apps"**
6. Click the **web icon `</>`** → name it `mb3-intake` → Register app
7. Copy the `firebaseConfig` object — it looks like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mb3-intake-xxxx.firebaseapp.com",
  databaseURL: "https://mb3-intake-xxxx-default-rtdb.firebaseio.com",
  projectId: "mb3-intake-xxxx",
  storageBucket: "mb3-intake-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. Open **`src/firebase.js`** in this project and paste your values in place of the REPLACE_WITH_ placeholders.

---

## Step 2 — Push to GitHub (2 min)

```bash
cd mb3-intake
git init
git add .
git commit -m "MB3 intake app — initial"
gh repo create mb3-intake --public --push --source=.
```

(If you don't have the `gh` CLI: create a new repo at github.com and follow their push instructions)

---

## Step 3 — Deploy to Vercel (3 min)

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"** → select `mb3-intake`
3. Framework Preset: **Vite** (auto-detected)
4. Click **Deploy**
5. Done — Vercel gives you a URL like `https://mb3-intake-xxxx.vercel.app`

---

## Step 4 — Send Dave the link

```
Hey Dave — here's the strategic alignment doc for our work together.

Click the link, enter the session code, and start filling it in.
I'll have the same code so we can both see it live.

Link: https://mb3-intake-xxxx.vercel.app
Session code: MAUGHAN1

No account needed — just click and go.
```

---

## How it works

- Both of you enter the same session code → you're in the same live document
- Every answer saves automatically to Firebase (< 1 second)
- Changes appear on both screens in real time — no refresh needed
- When done: click Export → Download .txt → paste into Word for the scope doc

---

## Firebase Security (do this before sharing with clients)

In the Firebase Console → Realtime Database → Rules, replace with:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

This is already open for now (test mode). Good enough for tonight.
For production, add password protection in the app layer.
