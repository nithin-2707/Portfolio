import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { fontshareTtf } from "@/lib/fontshare";

export const alt = "Nithin Gandrathi, software engineer: full-stack products and the AI inside them";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Panchang and Satoshi are fetched from Fontshare at build time (their licence keeps the files out of the repo)
const panchang = await fontshareTtf("panchang", 800);
const satoshi = await fontshareTtf("satoshi", 500);
const jetbrains = await readFile(join(process.cwd(), "assets/og/jetbrains-mono-latin-500-normal.woff"));
const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/icon-192.png"))).toString("base64")}`;

// A road on contour rings: the site's world in one frame.
const rings = [
  "M 760 470 C 820 380, 980 360, 1080 420 S 1180 560, 1060 600 S 820 590, 760 470 Z",
  "M 700 470 C 770 330, 1010 300, 1130 400 S 1230 600, 1060 640 S 760 620, 700 470 Z",
  "M 640 470 C 720 280, 1040 240, 1180 380 S 1280 640, 1060 680 S 700 660, 640 470 Z",
  "M 580 470 C 670 230, 1070 180, 1230 360 S 1330 690, 1060 720 S 640 700, 580 470 Z",
];

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5eedd",
          padding: "64px 72px",
          position: "relative",
          fontFamily: "Satoshi",
          color: "#0e2f44",
        }}
      >
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          {rings.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#84b3ce" strokeWidth={i === 2 ? 2.5 : 1.5} opacity={0.8} />
          ))}
          <path
            d="M 40 600 C 260 560, 380 520, 520 470 S 820 300, 980 250 S 1150 170, 1220 120"
            fill="none"
            stroke="#e8642c"
            strokeWidth={10}
            strokeLinecap="round"
          />
          <circle cx="40" cy="600" r="9" fill="#16587b" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={64} height={64} alt="" />
          <div style={{ display: "flex", fontFamily: "JetBrains", fontSize: 20, letterSpacing: 2, color: "#16587b" }}>
            18.0072° N · 79.5581° E · HANAMKONDA, IN
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Panchang", fontSize: 92, lineHeight: 0.95, letterSpacing: -3, color: "#16587b" }}>
            Nithin
          </div>
          <div style={{ fontFamily: "Panchang", fontSize: 92, lineHeight: 0.95, letterSpacing: -3, color: "#16587b" }}>
            Gandrathi
          </div>
          <div style={{ marginTop: 28, fontSize: 34, maxWidth: 640 }}>
            Software engineer. Full-stack products and the AI that runs inside them.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(panchang ? [{ name: "Panchang", data: panchang, style: "normal" as const, weight: 800 as const }] : []),
        ...(satoshi ? [{ name: "Satoshi", data: satoshi, style: "normal" as const, weight: 500 as const }] : []),
        { name: "JetBrains", data: jetbrains, style: "normal", weight: 500 },
      ],
    },
  );
}
