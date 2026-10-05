import { SitePage } from "@/components/marketing/SitePage";
import { APP_NAME, APP_TAGLINE } from "@/design/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_TAGLINE,
};

export default function WelcomePage() {
  return <SitePage />;
}
