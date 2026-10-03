# Capacitor wrap (later)

The web app is already a mobile-first PWA. Native stores come later without a rewrite.

1. `npm i @capacitor/core @capacitor/ios @capacitor/android @capacitor/camera @capacitor/barcode-scanner`
2. `npm i -D @capacitor/cli`
3. Set `output: "export"` in `next.config.ts` when you are ready for a static bundle (`webDir: out`).
4. `npx cap add ios` and `npx cap add android`
5. `npm run build && npx cap sync`
6. Camera / barcode permissions live in `Info.plist` and `AndroidManifest.xml`.
7. Keep Dexie as the offline vault; Supabase sync stays optional.
