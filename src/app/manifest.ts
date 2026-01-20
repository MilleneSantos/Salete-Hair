import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Salete Santos",
    short_name: "Salete",
    description: "Agendamentos do salao Salete Santos.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/imagens/salete-logo.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
