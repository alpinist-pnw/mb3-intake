# Firebase + Vercel + Vite — Setup Lessons Learned

**Project context:** MB3 intake app (mb3-intake.vercel.app)  
**Date:** February 21, 2026  
**Applies to:** Any Vite app using Firebase/Firestore deployed to Vercel

---

## 1. Vercel Environment Variables — Field Order

**The mistake:** Vercel's "Add Environment Variable" UI has two fields — Name and Value. It's easy to paste the credential string into Name and the variable name into Value. The result is silent failure: the app builds successfully but all Firebase calls use `undefined` as the project ID.

**The tell:** Check network requests in DevTools. If you see `database=projects%2Fundefined%2F...` in any Firestore request URL, env vars are not loading correctly.

**SOP:**
1. Name field = `VITE_FIREBASE_*` format (the variable name)
2. Value field = the actual credential string
3. After saving, click the variable to expand it and visually confirm Name/Value are correct before deploying
4. **Redeploy is required after any env var change** — existing deployments do not pick up new vars automatically

---

## 2. Firebase/Firestore Pre-Flight Checklist

Before writing any product UI, verify the full stack is operational:

- [ ] Firestore database provisioned in Firebase Console (not just project created)
- [ ] Security rules are open (test mode or explicit allow read/write)
- [ ] `.env` file exists at project root with all `VITE_*` variables
- [ ] Vite dev server restarted after `.env` creation
- [ ] Local app network requests show correct project ID (not `undefined`)
- [ ] Test write appears in Firebase Console → Firestore → Data
- [ ] Text persists after tab close and reopen
- [ ] Same verification repeated on deployed Vercel URL before building further

**Note:** Firestore test mode rules expire after 30 days. Set a calendar reminder to write proper security rules before expiry or all client requests will be denied.

---

## 3. Vite Environment Variable Rules

- All browser-accessible env vars **must** be prefixed with `VITE_`
- Variables without this prefix are stripped from the client bundle at build time — no error, silent failure
- `.env` file must be at the **project root** (same level as `package.json`), not inside `src/`
- **Vite must be restarted** after creating or modifying `.env` — hot reload does not pick up env changes
- Add `.env` to `.gitignore` before the first commit, not after

---

## 4. Firebase Realtime Database vs Firestore — Network Compatibility

**The original problem:** Firebase Realtime Database uses long-polling by default, which Chrome's enterprise/managed network policy may block as `ERR_BLOCKED`. This causes silent write failures with no error in the console.

**The fix:** Migrate to Firestore, which uses standard HTTPS fetch requests. If streaming connections are still blocked, add:

```js
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
```

This forces Firestore to use standard HTTP polling instead of WebSocket-style streaming — compatible with restrictive network environments.

---

## 5. Build-First Validation Protocol

**For any new Firebase-backed project, validate infrastructure before building UI:**

1. Create a minimal test page — one input field, one Firestore write, one read
2. Confirm write appears in Firebase Console
3. Confirm data persists across page reload
4. Confirm the same on the deployed URL
5. Only then build product UI on top of confirmed infrastructure

**Rationale:** Skipping this step cost ~2 hours of debugging in the mb3-intake session. The app appeared to work (status showed "live") but writes were silently failing due to `undefined` project ID.

---

## 6. Deployment Workflow (Vite + GitHub + Vercel)

```
local code change
  → git add -A && git commit -m "message" && git push
  → Vercel auto-deploys from GitHub (main branch)
  → new deployment appears at top of Vercel → Deployments
  → verify "Current" badge is on the newest deployment
  → test deployed URL
```

**Note:** Only one deployment is "Current" (serves production traffic). Past deployments in the list are inactive history — ignore them.

---

*Saved to: `/mnt/user-data/outputs/firebase-vercel-vite-setup-lessons.md`*  
*Also paste into: MB3 Intake project knowledge base*
