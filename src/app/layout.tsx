import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PT Hub · Fysiotherapie Nagtzaam", template: "%s · PT Hub" },
  description: "Trainingen, gewicht en voortgang bijhouden met je trainer van Fysiotherapie Nagtzaam.",
  robots: { index: false, follow: false },
  // Icoon en naam op het beginscherm van iPhone/iPad ("Zet op beginscherm").
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  appleWebApp: { capable: true, title: "Nagtzaam", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#101936", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
