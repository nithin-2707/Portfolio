import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { person, SITE_URL } from "@/content/site";
import { fontshareFaces } from "@/lib/fontshare";
import "./globals.css";

// Panchang and Satoshi load from Fontshare (see lib/fontshare.ts); JetBrains Mono (SIL OFL) is self-hosted.
const jetbrains = localFont({
  src: "./fonts/JetBrainsMono-Variable-latin.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
  preload: true,
});

const title = "Nithin Gandrathi · Software engineer, full-stack and AI";
const description =
  "Nithin Gandrathi, software engineer: full-stack web products and the AI inside them, from React and Next.js to FastAPI and LLM serving. See ATScribe and TheraCalm.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s · Nithin Gandrathi" },
  description,
  applicationName: "Nithin Gandrathi",
  authors: [{ name: person.name, url: SITE_URL }],
  creator: person.name,
  keywords: [
    "Nithin Gandrathi",
    "software engineer",
    "full-stack developer",
    "AI engineer",
    "LLM",
    "React",
    "Next.js",
    "Node.js",
    "FastAPI",
    "portfolio",
    "Hanamkonda",
    "VIT-AP University",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: "Nithin Gandrathi",
    title,
    description,
    firstName: person.givenName,
    lastName: person.familyName,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f5eedd",
  colorScheme: "light",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: SITE_URL,
  name: title,
  mainEntity: {
    "@type": "Person",
    name: person.name,
    givenName: person.givenName,
    familyName: person.familyName,
    jobTitle: "Software Engineer",
    description: person.description,
    url: SITE_URL,
    email: `mailto:${person.email}`,
    sameAs: [person.linkedin, person.github],
    address: { "@type": "PostalAddress", addressLocality: "Hanamkonda", addressRegion: "Telangana", addressCountry: "IN" },
    alumniOf: { "@type": "CollegeOrUniversity", name: "VIT-AP University" },
    knowsAbout: [
      "Full-stack web development",
      "React",
      "Next.js",
      "Node.js",
      "FastAPI",
      "Large language models",
      "LLM serving",
      "AI agents",
      "PostgreSQL",
      "MongoDB",
      "Microsoft Azure",
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = await fontshareFaces();
  return (
    <html lang="en" data-loading="true" className={jetbrains.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        {fonts.preload.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
        {fonts.css ? <style dangerouslySetInnerHTML={{ __html: fonts.css }} /> : null}
      </head>
      <body className="paper-grain">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <noscript>
          <style>{`html[data-loading="true"] body{overflow:auto!important}#launch{display:none!important}`}</style>
        </noscript>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
