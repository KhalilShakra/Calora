/**
 * Future App Store / Play wrap.
 * npm i @capacitor/core @capacitor/ios @capacitor/android
 * npm i -D @capacitor/cli
 * npx cap init ForgeFuel com.forgefuel.app --web-dir=out
 * Set next.config output: "export", then: npm run build && npx cap add ios && npx cap add android
 */
const config = {
  appId: "com.forgefuel.app",
  appName: "ForgeFuel",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0B1220",
    },
  },
};

export default config;
