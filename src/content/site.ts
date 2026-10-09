/**
 * Every fact on the site lives here.
 * - Main projects: ATScribe and TheraCalm (Live + GitHub).
 * - Other projects: StyleSync and LPG Navigator (GitHub).
 * - Real numbers only.
 */

/**
 * Public URL, used server-side only (metadata, sitemap, robots, JSON-LD, OG image).
 * Set NEXT_PUBLIC_SITE_URL in Vercel; otherwise Vercel's own production domain is used, then localhost.
 */
const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (vercelProduction ? `https://${vercelProduction}` : "http://localhost:3000")
).replace(/\/$/, "");

export const person = {
  name: "Nithin Gandrathi",
  givenName: "Nithin",
  familyName: "Gandrathi",
  role: "Software engineer",
  tagline: "I build full-stack products and the AI that runs inside them.",
  location: "Hanamkonda, Telangana, India",
  coordinates: { lat: "18.0072° N", lng: "79.5581° E" },
  timezone: "Asia/Kolkata",
  email: "nithingandrathi2707@gmail.com",
  linkedin: "https://www.linkedin.com/in/nithin-gandrathi/",
  github: "https://github.com/nithin-2707",
  description:
    "Nithin Gandrathi is a software engineer and B.Tech Computer Science graduate (VIT-AP University, 2026) who builds full-stack web products and LLM-powered systems: React and Next.js interfaces, Node.js and FastAPI services, and open-source model serving on GPUs.",
} as const;

export const bio =
  "I studied Computer Science at VIT-AP University, and I like working on every part of a product: the screen a person uses, the API behind it, and the models doing the thinking. Over three internships I have evaluated AI models at Scaler AI Labs, served open-source LLMs on GPU servers at Ventu Renewable, and built features for an AI voice and messaging platform at Inbotiq.";

/**
 * Profile as a rally roadbook: one row per instruction. `at` is the total distance column (a year or a month),
 * `split` the small partial reading under it, `turn` the tulip drawn in the middle box.
 */
export type RoadbookRow = {
  at: string;
  split?: string;
  turn: "start" | "straight" | "right" | "left" | "fork" | "next";
  place: string;
  note: string;
  detail?: string;
};

export const roadbook: RoadbookRow[] = [
  { at: "Start", turn: "start", place: "Hanamkonda, Telangana", note: "Where the route begins", detail: "Speaks English, Telugu and Hindi" },
  { at: "2020", turn: "straight", place: "Sri Chaitanya College", note: "Intermediate, MPC", detail: "91.6%" },
  { at: "2022", split: "+2 yrs", turn: "right", place: "VIT-AP University", note: "B.Tech, Computer Science", detail: "2022 – 2026 · CGPA 7.98" },
  { at: "2024", split: "+2 yrs", turn: "straight", place: "Cloud certificates, first public code", note: "Azure DP-900, AWS Academy, GitHub", detail: "Jul – Nov 2024" },
  { at: "2025", split: "+1 yr", turn: "fork", place: "Into AI", note: "Oracle GenAI Professional, then ATScribe", detail: "AWS Cloud Practitioner · MongoDB DBA" },
  { at: "Dec 2025", split: "SS1", turn: "right", place: "Scaler AI Labs", note: "AI training and evaluation", detail: "4 months · remote" },
  { at: "May 2026", split: "SS2", turn: "fork", place: "Ventu Renewable", note: "LLMs, agents and GPU servers", detail: "3 months · remote" },
  { at: "Jul 2026", split: "SS3", turn: "left", place: "Inbotiq", note: "Voice agents, product, an LLM service", detail: "Jul – Oct 2026 · remote" },
  { at: "Next", turn: "next", place: "A full-time role", note: "Software or AI engineering", detail: "Remote, or I'll relocate" },
];

/** The three-word beat: each word is a road sign that says what it means. */
export const signs = [
  { word: "Curious", sign: "junction", line: "Every exit taken once: the interface, the API, the model, the server." },
  { word: "careful", sign: "hairpin", line: "Slow in, fast out. Read the logs, test it, get it reviewed, then ship." },
  { word: "quick.", sign: "derestricted", line: "Once the line is clear, I commit to it and keep the pace." },
] as const;

export type Stage = {
  code: string;
  company: string;
  role: string;
  period: string;
  place: string;
  turn: "left" | "right" | "straight" | "fork";
  summary: string;
  /**
   * Three pace notes: what I did there, called in order as the road passes them. Short on purpose (the resume has
   * the rest). **x** sets a real figure in bold.
   */
  notes: [string, string, string];
  /** the stage result: one real number, read off the stage like a timing board */
  result: { value: string; label: string };
  /** an optional second reading */
  split?: { value: string; label: string };
  tools: string[];
};

export const stages: Stage[] = [
  {
    code: "SS1",
    company: "Scaler AI Labs",
    role: "AI Training & Evaluation Intern",
    period: "Dec 2025 – Mar 2026",
    place: "Remote",
    turn: "right",
    summary: "Where I learned how models are judged, one rubric at a time.",
    notes: [
      "Evaluated AI model outputs for correctness, completeness and how closely they followed the brief.",
      "Gave human-in-the-loop feedback that improved response accuracy, context handling and workflow reliability.",
      "Worked scenario tasks inside real enterprise tools, to detailed SOPs, quality guidelines and accuracy targets.",
    ],
    result: { value: "7", label: "enterprise tools worked across" },
    tools: ["Zendesk", "Jira", "Trello", "Slack", "SAP", "ASNA", "Google Drive"],
  },
  {
    code: "SS2",
    company: "Ventu Renewable",
    role: "AI Full Stack Developer Intern",
    period: "May – Jul 2026",
    place: "Remote",
    turn: "fork",
    summary: "Ran the models myself: GPUs, serving, agents and the platform around them.",
    notes: [
      "Served open-source LLMs (Qwen, Gemma, Devstral, Llama) with vLLM, Ollama and llama.cpp, tuning context, KV cache and quantization.",
      "Built agent workflows on Hermes Agent and OpenClaw, with MCP tools and persistent memory.",
      "Gave every model one-button start and stop, live GPU stats in the team dashboard, and HTTPS access through Tailscale.",
    ],
    result: { value: "8+", label: "open-source LLMs served on NVIDIA GPUs" },
    tools: ["vLLM", "Ollama", "llama.cpp", "Hermes Agent", "Linux"],
  },
  {
    code: "SS3",
    company: "Inbotiq",
    role: "Intern",
    period: "Jul – Oct 2026",
    place: "Remote",
    turn: "left",
    summary: "Shipped product end to end: voice agents, campaigns, billing and a production LLM service.",
    notes: [
      "Made real-time voice agents more reliable: **13** fixes traced from production call logs, each behind a feature flag.",
      "Built multichannel campaign automation (call, WhatsApp, email) across **167** templates, and a 5-step onboarding wizard.",
      "Owned a fine-tuned Qwen3-8B extraction service: corrected **780K+** company names and restored it after a 12-hour outage.",
    ],
    result: { value: "55.8M", label: "company records scanned by my data checks" },
    split: { value: "700+", label: "commits in the production release I ran" },
    tools: ["Next.js", "Node.js", "PostgreSQL", "FastAPI", "Azure"],
  },
];

/**
 * Service park: how I work, the four-phase rally loop every stage goes through. What I did at each stage lives in the
 * Stages pace notes above.
 */
export type Phase = { id: string; name: string; motto: string; how: string; proof: string };

export const phases: Phase[] = [
  {
    id: "recce",
    name: "Recce",
    motto: "Drive it slowly first.",
    how: "I read the code, the logs and the data, and measure what is there, before I change anything.",
    proof: "Benchmarked Qwen 3.6 while tuning its context and GPU memory; traced every voice fix from call logs and recordings.",
  },
  {
    id: "notes",
    name: "Pace notes",
    motto: "Write it down before you drive it.",
    how: "The plan, the brief or the prompt comes first, so the build has a line to follow and a reviewer can check it.",
    proof: "Wrote the daily build briefs a Hermes agent worked from.",
  },
  {
    id: "stage",
    name: "Flat out",
    motto: "Commit to the line.",
    how: "I build across the stack and ship through pull requests, tests and CI/CD.",
    proof: "At Inbotiq: 227 commits and 29 pull requests, all merged.",
  },
  {
    id: "service",
    name: "Service",
    motto: "Keep it running between stages.",
    how: "Shipping is not the finish. I make what I build easy to start, stop, watch and recover.",
    proof: "A cleanup job closed 581 orphaned call sessions that were blocking new calls.",
  },
];

export type Build = {
  slug: string;
  name: string;
  kind: string;
  period: string;
  pitch: string;
  story: string;
  stack: string[];
  live: string;
  github: string;
  /** a one-line heads-up printed under the buttons */
  note?: string;
  /** a URL to wake when the chapter nears view (a free-tier API that sleeps) */
  warm?: string;
  shots: { src: string; label: string; alt: string }[];
  callouts: { text: string; x: number; y: number; side: "left" | "right" }[];
};

export const builds: Build[] = [
  {
    slug: "atscribe",
    name: "ATScribe",
    kind: "AI resume analysis platform",
    period: "Nov 2025 – Jan 2026",
    pitch: "Upload a resume, paste a job description, get an honest read on the match.",
    story:
      "Students get overall, skill and semantic match scores, a skill-gap report, a chat about their own resume and a preparation plan for 7 to 90 days. Recruiters upload a batch of resumes and get a ranked shortlist for the role.",
    stack: ["React", "Node.js", "Express", "MongoDB Atlas", "Groq · Llama 3.3"],
    live: "https://atscribe-ai-resume-analyzer-fronten.vercel.app/",
    github: "https://github.com/nithin-2707/atscribe-ai-resume-analyzer",
    note: "Its analysis server sleeps when idle, so the first run can take about 30 seconds.",
    warm: "https://atscribe-ai-resume-analyzer.onrender.com",
    shots: [
      { src: "/projects/atscribe-landing.webp", label: "Landing", alt: "ATScribe landing page: Transforming how talent is discovered and hired" },
      { src: "/projects/atscribe-dashboard.webp", label: "Analysis", alt: "ATScribe dashboard for uploading a resume and pasting a job description" },
      { src: "/projects/atscribe-recruiter.webp", label: "Recruiter", alt: "ATScribe recruiter mode for ranking a batch of resumes" },
      { src: "/projects/atscribe-chat.webp", label: "Resume chat", alt: "ATScribe chat-with-your-resume screen" },
    ],
    // pinned to the landing screen (the first, open shot); labels sit in the left margin
    callouts: [
      { text: "Validation rejects job posts uploaded as resumes", x: 0.5, y: 0.22, side: "left" },
      { text: "Overall, skill and semantic match scores", x: 0.37, y: 0.42, side: "left" },
      { text: "Exponential backoff on 429 rate limits", x: 0.64, y: 0.6, side: "left" },
      { text: "Llama 3.3 70B on Groq via the OpenAI-compatible SDK", x: 0.64, y: 0.79, side: "left" },
    ],
  },
  {
    slug: "theracalm",
    name: "TheraCalm",
    kind: "Website for a therapy practice",
    period: "Feb – Mar 2026",
    pitch: "A calm, trustworthy front door for a therapist, built to turn visits into bookings.",
    story:
      "Therapists do careful work, but their websites rarely show it. TheraCalm gives visitors a quiet place to learn about therapy, feel safe reaching out and book an appointment easily.",
    stack: ["Next.js 14", "TypeScript", "Tailwind CSS", "GSAP"],
    live: "https://theracalm.vercel.app/",
    github: "https://github.com/nithin-2707/Frontend-Project-TheraCalm",
    shots: [
      { src: "/projects/theracalm-home.webp", label: "Home", alt: "TheraCalm home page: Rediscover calm in the chaos" },
      { src: "/projects/theracalm-about.webp", label: "About", alt: "TheraCalm about page with the therapist's approach" },
      { src: "/projects/theracalm-contact.webp", label: "Booking", alt: "TheraCalm booking form: name, email, phone and message, with required fields marked" },
      { src: "/projects/theracalm-mobile.webp", label: "Mobile", alt: "TheraCalm home page on a phone, shown in a device frame" },
    ],
    // pinned to the home screen (the first, open shot); labels sit in the left margin
    callouts: [
      { text: "GSAP ScrollTrigger reveals and an animated pill nav", x: 0.47, y: 0.1, side: "left" },
      { text: "Next.js 14 App Router, typed end to end", x: 0.62, y: 0.38, side: "left" },
      { text: "Validated booking form behind every CTA", x: 0.58, y: 0.63, side: "left" },
      { text: "Open Graph and Twitter cards through the Metadata API", x: 0.3, y: 0.88, side: "left" },
    ],
  },
];

export type SideRoad = { name: string; line: string; stack: string[]; github: string; image: string; alt: string };

export const sideRoads: SideRoad[] = [
  {
    name: "StyleSync",
    line: "Paste any URL and get its design system back: colors, type and spacing scraped, normalized into tokens, exported as CSS, JSON or a Tailwind config.",
    stack: ["Next.js", "TypeScript", "Playwright", "Prisma", "PostgreSQL"],
    github: "https://github.com/nithin-2707/StyleSync",
    image: "/projects/stylesync-hero.webp",
    alt: "StyleSync: transform any website into a living design system",
  },
  {
    name: "LPG Navigator",
    line: "Finds the fuel stations around you from your GPS position, using live OpenStreetMap data on a Leaflet map with directions.",
    stack: ["React", "Vite", "Leaflet", "Express"],
    github: "https://github.com/nithin-2707/Lpg-Navigation-System",
    image: "/projects/lpg-navigator-crop.webp",
    alt: "LPG Navigator dashboard with a map of nearby fuel stations",
  },
];

export type Gear = { gear: string; name: string; note: string; items: { name: string; icon?: string }[] };

/** Icons resolve to /icons/<icon>.svg (from thesvg.org). */
export const gears: Gear[] = [
  {
    gear: "1",
    name: "Languages",
    note: "What I think in.",
    items: [
      { name: "Python", icon: "python" },
      { name: "TypeScript", icon: "typescript" },
      { name: "JavaScript", icon: "javascript" },
      { name: "Java", icon: "java" },
      { name: "SQL" },
    ],
  },
  {
    gear: "2",
    name: "Frontend",
    note: "The part people touch.",
    items: [
      { name: "React", icon: "react" },
      { name: "Next.js", icon: "nextjs" },
      { name: "Tailwind CSS", icon: "tailwind-css" },
      { name: "GSAP", icon: "gsap" },
      { name: "HTML & CSS", icon: "html5" },
    ],
  },
  {
    gear: "3",
    name: "Backend & data",
    note: "The part that has to be right.",
    items: [
      { name: "Node.js", icon: "nodejs" },
      { name: "Express", icon: "express" },
      { name: "FastAPI", icon: "fastapi" },
      { name: "PostgreSQL", icon: "postgresql" },
      { name: "MongoDB", icon: "mongodb" },
      { name: "Prisma", icon: "prisma" },
    ],
  },
  {
    gear: "4",
    name: "AI & LLMs",
    note: "Serving, calling and orchestrating models.",
    items: [
      { name: "vLLM", icon: "vllm" },
      { name: "Ollama", icon: "ollama" },
      { name: "Hugging Face", icon: "hugging-face" },
      { name: "Gemini", icon: "gemini" },
      { name: "Groq", icon: "groq" },
      { name: "OpenAI-compatible APIs", icon: "openai" },
      { name: "AI agents & MCP" },
    ],
  },
  {
    gear: "5",
    name: "Cloud & tools",
    note: "Where it runs and how it ships.",
    items: [
      { name: "Microsoft Azure", icon: "azure" },
      { name: "AWS", icon: "aws" },
      { name: "Linux", icon: "linux" },
      { name: "Vercel", icon: "vercel" },
      { name: "Postman", icon: "postman" },
    ],
  },
  {
    gear: "6",
    name: "Ways of working",
    note: "How changes reach production.",
    items: [
      { name: "Git & GitHub", icon: "github" },
      { name: "GitHub Actions CI/CD", icon: "github-actions" },
      { name: "Code review" },
      { name: "Unit testing", icon: "jest" },
      { name: "Agile delivery" },
    ],
  },
];

export type Licence = { name: string; issuer: string; issued: string; icon?: string; verify?: string; primary: boolean };

export const licences: Licence[] = [
  {
    name: "MongoDB Certified DBA Associate (C100DBA)",
    issuer: "MongoDB",
    issued: "Sep 2025",
    icon: "mongodb",
    verify: "https://www.credly.com/badges/150c62f5-4b18-4af3-936e-32ab82b010fa",
    primary: true,
  },
  {
    name: "Oracle Cloud Infrastructure 2025 Certified Generative AI Professional",
    issuer: "Oracle",
    issued: "Jul 2025",
    icon: "oracle",
    verify:
      "https://catalog-education.oracle.com/ords/certview/sharebadge?id=345EC49A5FBE26B08BEF3769855657BF6CE3BF55659C44B8B6ACEF8A1000A0D2",
    primary: true,
  },
  {
    name: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    issued: "Jul 2025",
    icon: "aws",
    verify: "https://www.credly.com/badges/43a39ece-21e3-4afb-a3c4-8550dc9db67a",
    primary: true,
  },
  {
    name: "Microsoft Certified: Azure Data Fundamentals (DP-900)",
    issuer: "Microsoft",
    issued: "Jul 2024",
    icon: "microsoft",
    primary: true,
  },
  {
    name: "Skyscanner Software Engineering Job Simulation",
    issuer: "Forage",
    issued: "Feb 2026",
    icon: "forage",
    verify:
      "https://www.theforage.com/completion-certificates/skoQmxqhtgWmKv2pm/p3xGFkpdot5H8NBih_skoQmxqhtgWmKv2pm_u44jCz96a7J7LRXo6_1771840649172_completion_certificate.pdf",
    primary: false,
  },
  {
    name: "AWS Academy Graduate: Cloud Architecting",
    issuer: "Amazon Web Services",
    issued: "Nov 2024",
    icon: "aws",
    primary: false,
  },
  {
    name: "AWS Academy Graduate: Cloud Foundations",
    issuer: "Amazon Web Services",
    issued: "Sep 2024",
    icon: "aws",
    verify: "https://www.credly.com/badges/dddd202b-3902-499d-b2a8-ce76c2bd4c92",
    primary: false,
  },
  {
    name: "Java 11 Essentials",
    issuer: "Infosys Springboard",
    issued: "Jun 2023",
    icon: "infosys",
    primary: false,
  },
];

/** Waypoints in route order. ids match section ids. */
export const waypoints = [
  { id: "start", label: "Start" },
  { id: "profile", label: "Profile" },
  { id: "stages", label: "Stages" },
  { id: "service-park", label: "Service park" },
  { id: "builds", label: "Builds" },
  { id: "side-roads", label: "Side roads" },
  { id: "gearbox", label: "Gearbox" },
  { id: "licences", label: "Licences" },
  { id: "finish", label: "Finish" },
] as const;
