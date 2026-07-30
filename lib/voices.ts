/**
 * The four voices offered at onboarding (BUILD.MD §5.2). Names are in the blue
 * family because the orb is; the ids come from .env so they can be swapped
 * without touching code.
 */
export type Voice = {
  id: string;
  key: "cobalt" | "indigo" | "ultramarine" | "cerulean";
  name: string;
  /** Distinct blue-family gradient, used for that voice's orb on the picker. */
  gradient: string;
  /** The two light pools that wander inside that orb, in the voice's colours. */
  poolA: string;
  poolB: string;
  sample: string;
  /**
   * Kept to what is actually known about the voice. Claiming a timbre we have
   * not heard would be decoration pretending to be information — tapping the
   * orb plays the real thing, which is the honest way to choose.
   */
  description: string;
};

const SAMPLE = (name: string) => `Hi — I'm ${name}. Let's keep your tallies.`;

export const VOICES: Voice[] = [
  {
    id: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_COBALT ?? "",
    key: "cobalt",
    name: "Cobalt",
    gradient: "conic-gradient(from 200deg, #2547C9, #35C8E8, #3A1F9E, #2547C9)",
    poolA: "#35C8E8",
    poolB: "#2547C9",
    sample: SAMPLE("Cobalt"),
    description: "A man\u2019s voice.",
  },
  {
    id: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_INDIGO ?? "",
    key: "indigo",
    name: "Indigo",
    gradient: "conic-gradient(from 40deg, #3A1F9E, #6E4BFF, #2547C9, #3A1F9E)",
    poolA: "#6E4BFF",
    poolB: "#3A1F9E",
    sample: SAMPLE("Indigo"),
    description: "A woman\u2019s voice.",
  },
  {
    id: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ULTRAMARINE ?? "",
    key: "ultramarine",
    name: "Ultramarine",
    gradient: "conic-gradient(from 120deg, #1B2B6B, #2547C9, #7B5BFF, #1B2B6B)",
    poolA: "#7B5BFF",
    poolB: "#1B2B6B",
    sample: SAMPLE("Ultramarine"),
    description: "A man\u2019s voice.",
  },
  {
    id: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_CERULEAN ?? "",
    key: "cerulean",
    name: "Cerulean",
    gradient: "conic-gradient(from 300deg, #35C8E8, #2547C9, #3A1F9E, #35C8E8)",
    poolA: "#35C8E8",
    poolB: "#3A1F9E",
    sample: SAMPLE("Cerulean"),
    description: "A woman\u2019s voice.",
  },
];

export function voiceByKey(key: string): Voice | undefined {
  return VOICES.find((v) => v.key === key);
}

export function voiceById(id: string | null | undefined): Voice | undefined {
  if (!id) return undefined;
  return VOICES.find((v) => v.id === id);
}

/** The agent is what makes any of this work; without it we degrade honestly. */
export function isAgentConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
}
