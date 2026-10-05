import { LangSync } from "@/components/LangSync";
import { RootFrame } from "@/components/RootFrame";
import { RegisterSW } from "@/components/RegisterSW";
import { ThemeSync } from "@/components/ThemeSync";
import { APP_NAME, APP_TAGLINE } from "@/design/brand";
import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C0E0C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${sora.variable}`}>
      <body className="font-sans antialiased">
        <RegisterSW />
        <ThemeSync />
        <LangSync />
        <RootFrame>{children}</RootFrame>
      </body>
    </html>
  );
}
