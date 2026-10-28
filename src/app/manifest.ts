import type { MetadataRoute } from "next";

// Bepaalt naam, icoon en kleuren wanneer de hub als app op het beginscherm wordt gezet (Android/Chrome).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PT Hub · Fysiotherapie Nagtzaam",
    short_name: "Nagtzaam",
    description: "Trainingen, gewicht en voortgang bijhouden met je trainer van Fysiotherapie Nagtzaam.",
    lang: "nl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101936",
    theme_color: "#101936",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
