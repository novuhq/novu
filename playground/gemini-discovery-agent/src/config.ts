import { readFileSync } from 'node:fs';

/** One agent the Discovery Agent can forward to (an entry in agents.json). */
export type TargetAgent = {
  /** Local id: what the classifier picks, and the key of this agent's session. */
  id: string;
  name: string;
  /** What the classifier reads to pick this agent. */
  description: string;
  /** `a2a_proxy` for registered A2A agents, `stream_assist` for Google-made agents. */
  path: 'a2a_proxy' | 'stream_assist';
  /** Gemini Enterprise agent id. */
  targetId: string;
};

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback;
  if (!value) throw new Error(`${name} is required`);

  return value;
}

// Read by @novu/framework itself to post replies to Novu.
env('NOVU_SECRET_KEY');

export const config = {
  port: Number(env('PORT', '8080')),
  project: env('GOOGLE_CLOUD_PROJECT'),
  engine: env('GE_ENGINE'),
  vertexLocation: env('VERTEX_LOCATION', 'global'),
  geminiModel: env('GEMINI_MODEL', 'gemini-3.5-flash'),
  classifierModel: env('GEMINI_CLASSIFIER_MODEL', 'gemini-3.5-flash-lite'),
};

export const agents: TargetAgent[] = JSON.parse(readFileSync(env('AGENTS_FILE', './agents.json'), 'utf8'));

export const agentById = (id: string | undefined) => agents.find((agent) => agent.id === id);
