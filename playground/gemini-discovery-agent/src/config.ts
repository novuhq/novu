import { readFileSync } from 'node:fs';
import path from 'node:path';

export type ForwardPath = 'a2a_proxy' | 'stream_assist';

export type TargetAgent = {
  /** Local id: routing option, metadata key, log field. */
  id: string;
  name: string;
  description: string;
  path: ForwardPath;
  /** Gemini Enterprise agent id (last segment of the agent resource name). */
  targetId: string;
};

export type Config = {
  port: number;
  novuSecretKey: string | undefined;
  project: string;
  engine: string;
  vertexLocation: string;
  geminiModel: string;
  classifierModel: string;
  agents: TargetAgent[];
};

export const DIRECT = 'direct';

/** The Core Assistant itself: streamAssist with no agentsSpec. */
export const CORE_ASSISTANT_ID = 'default_assistant';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);

  return value;
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 8080),
    novuSecretKey: process.env.NOVU_SECRET_KEY?.trim() || undefined,
    project: required('GOOGLE_CLOUD_PROJECT'),
    engine: required('GE_ENGINE'),
    vertexLocation: process.env.VERTEX_LOCATION?.trim() || 'global',
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash',
    classifierModel: process.env.GEMINI_CLASSIFIER_MODEL?.trim() || 'gemini-3.5-flash-lite',
    agents: JSON.parse(readFileSync(path.resolve(process.env.AGENTS_FILE?.trim() || './agents.json'), 'utf8')),
  };
}

export function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ severity: 'INFO', event, ...data }));
}
