import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date("2026-10-03"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
