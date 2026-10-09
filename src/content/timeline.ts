/**
 * The route so far: every dated fact from my work and study, laid out in lanes for the
 * stage-profile strip under the hero. Dates are "YYYY-MM". Where only the year is known (the degree), the
 * display text shows the year only and the month is a placement guess that is never printed.
 * Rules: real dates only, no "currently at" wording. An open item
 * (end: "open") is drawn fading into the road ahead, never labelled "present".
 */

export type LaneId = "study" | "web" | "ai" | "agents" | "cloud";

export const lanes: { id: LaneId; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "web", label: "Full-stack" },
  { id: "ai", label: "AI & LLMs" },
  { id: "agents", label: "Agents & voice" },
  { id: "cloud", label: "Cloud & GPUs" },
];

export type RouteItem = {
  lane: LaneId;
  /** bar = a stretch with a start and an end; event = one waypoint */
  kind: "bar" | "event";
  start: string;
  end?: string | "open";
  /** short label on the strip */
  label: string;
  /** one line of detail, shown when the item is reached or hovered */
  detail?: string;
  /** the period exactly as it may be printed */
  period: string;
};

export const ROUTE_START = "2022-01";
export const ROUTE_END = "2026-10";

export const routeItems: RouteItem[] = [
  // study
  { lane: "study", kind: "bar", start: "2022-08", end: "2026-05", label: "B.Tech, Computer Science", detail: "VIT-AP University · CGPA 7.98", period: "2022 – 2026" },
  { lane: "study", kind: "event", start: "2023-06", label: "Java 11 Essentials", detail: "Infosys Springboard · first certificate", period: "Jun 2023" },

  // full-stack
  { lane: "web", kind: "event", start: "2024-10", label: "First public repos", detail: "github.com/nithin-2707", period: "Oct 2024" },
  { lane: "web", kind: "event", start: "2025-09", label: "MongoDB DBA Associate", detail: "C100DBA certification", period: "Sep 2025" },
  { lane: "web", kind: "bar", start: "2025-11", end: "2026-01", label: "ATScribe", detail: "AI resume analysis platform · React, Node.js, MongoDB", period: "Nov 2025 – Jan 2026" },
  { lane: "web", kind: "bar", start: "2026-02", end: "2026-03", label: "TheraCalm", detail: "Therapy practice website · Next.js, GSAP", period: "Feb – Mar 2026" },
  { lane: "web", kind: "event", start: "2026-04", label: "StyleSync · LPG Navigator", detail: "Design-token extractor and fuel-station finder", period: "Apr 2026" },
  { lane: "web", kind: "bar", start: "2026-07", end: "2026-10", label: "Inbotiq platform", detail: "Campaign automation, onboarding wizards, billing fixes, a production release", period: "Jul – Oct 2026" },

  // AI & LLMs
  { lane: "ai", kind: "event", start: "2025-07", label: "OCI Generative AI Professional", detail: "Oracle Cloud Infrastructure 2025", period: "Jul 2025" },
  { lane: "ai", kind: "bar", start: "2025-12", end: "2026-03", label: "Scaler AI Labs", detail: "Human-in-the-loop model training and evaluation", period: "Dec 2025 – Mar 2026" },
  { lane: "ai", kind: "bar", start: "2026-05", end: "2026-07", label: "Ventu Renewable", detail: "8+ open-source LLMs served on NVIDIA GPUs", period: "May – Jul 2026" },
  { lane: "ai", kind: "bar", start: "2026-09", end: "2026-10", label: "LLM extraction service", detail: "Fine-tuned Qwen3-8B on SGLang · data checks across 55.8M records", period: "Sep – Oct 2026" },

  // agents & voice
  { lane: "agents", kind: "bar", start: "2026-05", end: "2026-07", label: "Agent workflows", detail: "Hermes Agent, OpenClaw and MCP tools", period: "May – Jul 2026" },
  { lane: "agents", kind: "bar", start: "2026-07", end: "2026-10", label: "Voice agents", detail: "13 reliability fixes and a Gemini / GPT-4.1 switch", period: "Jul – Oct 2026" },

  // cloud & GPUs
  { lane: "cloud", kind: "event", start: "2024-07", label: "Azure DP-900", detail: "Microsoft Azure Data Fundamentals", period: "Jul 2024" },
  { lane: "cloud", kind: "event", start: "2024-09", label: "AWS Academy", detail: "Cloud Foundations, then Cloud Architecting (Nov 2024)", period: "Sep 2024" },
  { lane: "cloud", kind: "event", start: "2025-07", label: "AWS Cloud Practitioner", detail: "AWS Certified Cloud Practitioner", period: "Jul 2025" },
  { lane: "cloud", kind: "bar", start: "2026-05", end: "2026-07", label: "GPU servers", detail: "Linux, systemd, Tailscale HTTPS, one-button model start and stop", period: "May – Jul 2026" },
  { lane: "cloud", kind: "bar", start: "2026-07", end: "2026-10", label: "Azure + CI/CD", detail: "Azure App Service, A100s, GitHub Actions gates", period: "Jul – Oct 2026" },
];

/** The three internships as stage flags on the axis (they match the Stages section's codes). */
export const stageFlags = [
  { code: "SS1", at: "2025-12", label: "Scaler AI Labs" },
  { code: "SS2", at: "2026-05", label: "Ventu Renewable" },
  { code: "SS3", at: "2026-07", label: "Inbotiq" },
] as const;

/** Where the road goes next. */
export const nextStage = { label: "Next stage", detail: "A full-time software or AI engineering role" } as const;

/** months since ROUTE_START, for placing things on the axis */
export function monthIndex(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const [y0, m0] = ROUTE_START.split("-").map(Number);
  return (y - y0) * 12 + (m - m0);
}
export const ROUTE_MONTHS = monthIndex(ROUTE_END);
