# iOS Strategy

## Recommendation

**Ship the responsive web app (installable PWA) now; wrap with Capacitor when an App Store presence is needed.** Do not rewrite in React Native or Swift.

| Path | Verdict | Reasoning |
|---|---|---|
| Responsive web + PWA | ✅ now | Zero additional codebase; the app is mobile-first, has a manifest, icons, and safe-area handling; installable from Safari today |
| Capacitor wrapper | ✅ when App Store distribution is wanted | Reuses this exact Vite/React build; adds native shell, push, and App Store distribution with small, well-understood changes |
| React Native | ❌ | Full rewrite of a working codebase for no current product need |
| Native Swift | ❌ | Two codebases to maintain for a pre-launch product |

## What was prepared in this codebase

- `public/manifest.webmanifest` + 192/512 icons and `apple-touch-icon` generated from the official logo (proportions preserved; the logo's own solid background makes icon/splash generation distortion-free)
- `viewport-fit=cover` and safe-area padding (`env(safe-area-inset-*)`) on the header and bottom navigation
- All API calls go through `src/lib/api.ts` — `VITE_API_BASE_URL` points packaged builds at the hosted API; nothing depends on `localhost`
- Auth token is a bearer token in `localStorage` — works unchanged inside a Capacitor WKWebView (see risks)
- No desktop-only browser APIs in use; uploads use `<input type="file">`, which iOS presents as camera / photo library

## Future iOS release checklist

1. Host the API on a stable HTTPS domain (blocked by the JSON-DB migration below).
2. `npm i @capacitor/core @capacitor/cli @capacitor/ios && npx cap init && npx cap add ios`.
3. Build with `VITE_API_BASE_URL=https://<api-domain>`; `npx cap sync ios`.
4. Generate icon/splash sets from `logo/NEST_OFFICIAL_LOGO.png` (`@capacitor/assets`).
5. Configure `Info.plist` permission strings: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (profile photos).
6. Review external links (Google Maps links should open in the system browser via `@capacitor/browser`).
7. Push notifications (if wanted): `@capacitor/push-notifications` + APNs key + a server-side sender.
8. Deep links / universal links: add an `apple-app-site-association` file on the API domain if links into matches/events are needed.
9. Test the on-screen keyboard with the fixed bottom navigation (Capacitor keyboard plugin `resize` mode).
10. App Review pass, then submit.

## Apple Developer / App Store Connect actions (require the account owner)

- Enroll in the Apple Developer Program (€99/year), create the App ID / bundle identifier
- Certificates & provisioning profiles (Xcode-managed signing is fine)
- App Store Connect listing: name, subtitle, screenshots (6.7" and 5.5"), description, keywords, support URL
- **Privacy nutrition labels**: the app collects name, age, nationality, email, photos, messages, and social handles linked to identity — this must be declared
- Privacy policy URL (required; does not exist yet)
- Age rating questionnaire (social networking, user-generated content → 17+ likely unless moderation tooling is demonstrated)
- **User-generated content rules (Guideline 1.2)**: Apple requires reporting, blocking, and moderation for UGC apps — build these before submission (they are on the product roadmap already)
- **Sign in with Apple (Guideline 4.8)**: required only if a third-party social login (Google, Facebook…) is added; the current email/password login does not trigger it
- **In-app purchase risk (Guideline 3.1.1)**: NEST Premium unlocks RSVPs to real-world, in-person events. Payments for real-world experiences may use Stripe; access to digital features must use IAP. The current gating (RSVP to physical outings) has a defensible real-world-services argument, but Apple's ruling is not guaranteed — budget for a possible IAP variant or web-only purchase flow (external purchase links rules are jurisdiction-dependent). Get this assessed before submission.

## Features that may require native plugins

Camera/photo library (works via web input; plugin optional), push notifications (native only), haptics, geolocation (if real location features ship), secure storage (see below), app badges.

## Risks from the current architecture

- **JSON-file database + `/tmp` on Vercel**: an iOS app must point at a persistent hosted API. The database migration is a hard prerequisite for any App Store release.
- **Bearer token in localStorage/WKWebView**: acceptable for development; for production consider `@capacitor-community/secure-storage` (Keychain) and shorter-lived tokens. Session revocation on logout/deletion is already server-side.
- **5-second polling** for matches/notifications drains mobile batteries; move to push or longer intervals before release.
