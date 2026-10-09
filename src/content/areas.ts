/**
 * The five areas I work in, for the hero (each area is one part of the drawing that the pointer cues).
 * Every proof line is a real fact from my work: no invented numbers.
 */

export type Area = {
  id: "llm" | "agents" | "voice" | "web" | "infra";
  /** short name, shown on the drawing */
  label: string;
  /** one line, shown when the area is cued */
  proof: string;
  /** where this was done */
  where: string;
  tools: string[];
};

export const areas: Area[] = [
  {
    id: "llm",
    label: "LLM serving",
    proof:
      "8+ open-source LLMs (Qwen, Gemma, Devstral, Llama) served on NVIDIA GPUs, and a fine-tuned Qwen3-8B in production on SGLang.",
    where: "Ventu Renewable · Inbotiq",
    tools: ["vLLM", "Ollama", "llama.cpp", "SGLang"],
  },
  {
    id: "agents",
    label: "AI agents",
    proof: "Agent workflows on Hermes Agent, OpenClaw and MCP tools, with persistent memory and daily build briefs the agent works from.",
    where: "Ventu Renewable",
    tools: ["Hermes Agent", "OpenClaw", "MCP"],
  },
  {
    id: "voice",
    label: "Voice & messaging",
    proof: "Campaigns across calls, WhatsApp and email, 13 voice-agent fixes behind feature flags, and a Gemini / GPT-4.1 switch in the live call pipeline.",
    where: "Inbotiq",
    tools: ["pipecat", "FastAPI", "Next.js", "PostgreSQL"],
  },
  {
    id: "web",
    label: "Full-stack web",
    proof: "React and Next.js front ends and Node.js APIs, designed, built and shipped end to end.",
    where: "ATScribe · TheraCalm",
    tools: ["React", "Next.js", "Node.js", "MongoDB"],
  },
  {
    id: "infra",
    label: "Cloud & GPUs",
    proof: "Linux GPU servers with one-button start and stop for every model, Tailscale HTTPS access, Azure A100s and CI/CD.",
    where: "Ventu Renewable · Inbotiq",
    tools: ["Linux", "systemd", "Tailscale", "Azure"],
  },
];
