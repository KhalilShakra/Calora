import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ForgeFuel",
    short_name: "ForgeFuel",
    description: "Earn your fuel. Level your life.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1220",
    theme_color: "#0B1220",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
