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
  jevApiKey: string | undefined;
  jevApiUrl: string;
  agents: TargetAgent[];
};

export const DIRECT = 'direct';

const LOCAL_ID = /^[a-z][a-z0-9_]{0,31}$/;
const NUMERIC_AGENT_ID = /^\d{1,24}$/;
// streamAssist silently falls back to the default assistant on an unknown agentId, so only
// known managed ids or numeric registered ids are accepted.
const MANAGED_STREAM_ASSIST_IDS = new Set(['deep_research']);
const ENGINE_PATH = /^projects\/[^/]+\/locations\/[^/]+\/collections\/[^/]+\/engines\/[^/]+$/;

export function loadAgents(file: string): TargetAgent[] {
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`${file}: expected a non-empty JSON array`);
  if (raw.length > 10) throw new Error(`${file}: at most 10 agents (choice cards hold 2-10 options)`);

  const seen = new Set<string>();

  return raw.map((entry, index): TargetAgent => {
    const where = `${file}[${index}]`;
    const { id, name, description, path: forwardPath, targetId } = (entry ?? {}) as Record<string, unknown>;
    if (typeof id !== 'string' || !LOCAL_ID.test(id) || id === DIRECT) throw new Error(`${where}: invalid id ${JSON.stringify(id)}`);
    if (seen.has(id)) throw new Error(`${where}: duplicate id ${id}`);
    seen.add(id);
    if (typeof name !== 'string' || !name.trim()) throw new Error(`${where}: name is required`);
    if (typeof description !== 'string' || !description.trim()) throw new Error(`${where}: description is required`);
    if (forwardPath !== 'a2a_proxy' && forwardPath !== 'stream_assist') throw new Error(`${where}: invalid path ${JSON.stringify(forwardPath)}`);
    if (typeof targetId !== 'string') throw new Error(`${where}: targetId is required`);
    const validTarget =
      forwardPath === 'a2a_proxy'
        ? NUMERIC_AGENT_ID.test(targetId)
        : MANAGED_STREAM_ASSIST_IDS.has(targetId) || NUMERIC_AGENT_ID.test(targetId);
    if (!validTarget) throw new Error(`${where}: invalid targetId ${JSON.stringify(targetId)} for path ${forwardPath}`);

    return { id, name: name.trim(), description: description.trim(), path: forwardPath, targetId };
  });
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);

  return value;
}

export function loadConfig(): Config {
  const engine = required('GE_ENGINE');
  if (!ENGINE_PATH.test(engine)) throw new Error(`GE_ENGINE must be projects/*/locations/*/collections/*/engines/*, got ${engine}`);

  return {
    port: Number(process.env.PORT ?? 8080),
    novuSecretKey: process.env.NOVU_SECRET_KEY?.trim() || undefined,
    project: required('GOOGLE_CLOUD_PROJECT'),
    engine,
    vertexLocation: process.env.VERTEX_LOCATION?.trim() || 'global',
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash',
    classifierModel: process.env.GEMINI_CLASSIFIER_MODEL?.trim() || 'gemini-3.5-flash-lite',
    jevApiKey: process.env.JEV_API_KEY?.trim() || undefined,
    jevApiUrl: process.env.JEV_API_URL?.trim() || 'https://jevtypesafeai.com/api/v1/decide',
    agents: loadAgents(path.resolve(process.env.AGENTS_FILE?.trim() || './agents.json')),
  };
}

export function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ severity: 'INFO', event, ...data }));
}
