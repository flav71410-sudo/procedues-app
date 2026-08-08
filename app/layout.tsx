import type { Metadata, Viewport } from "next";
import "./globals.css";

import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "SécuManager",
    template: "%s | SécuManager",
  },

  description:
    "Plateforme de gestion de la sécurité incendie, de la maintenance des équipements et du suivi réglementaire.",

  applicationName: "SécuManager",

  icons: {
    icon: [
      {
        url: "/secumanager-logo.png",
        type: "image/png",
      },
    ],

    shortcut: "/secumanager-logo.png",

    apple: [
      {
        url: "/secumanager-logo.png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
    >
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}