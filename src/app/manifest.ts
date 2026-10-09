import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nithin Gandrathi · Software engineer",
    short_name: "Nithin G",
    description: "Portfolio of Nithin Gandrathi: full-stack products and the AI inside them.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5eedd",
    theme_color: "#f5eedd",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
