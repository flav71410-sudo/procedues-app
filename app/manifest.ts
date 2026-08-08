import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SécuManager",

    short_name: "SécuManager",

    description:
      "Gestion de la sécurité incendie, de la maintenance des équipements et du suivi réglementaire.",

    start_url: "/",

    display: "standalone",

    background_color: "#07111f",

    theme_color: "#0b5ed7",

    icons: [
      {
        src: "/secumanager-logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}