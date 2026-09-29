import type { Config } from '../config.ts';
import { GoogleHttpError, googleRequest } from '../google-auth.ts';
import type { ForwardResult } from './index.ts';

// A Deep Research report took 484 s in the sandbox; leave headroom.
const TIMEOUT_MS = 20 * 60_000;

type AssistChunk = {
  error?: { code?: number; message?: string };
  sessionInfo?: { session?: string };
  answer?: {
    state?: string;
    assistSkippedReasons?: string[];
    replies?: Array<{ groundedContent?: { content?: { text?: string; thought?: boolean } } }>;
  };
};

/** streamAssist (v1alpha, SSE) with `agentsSpec` naming one agent; the session carries the conversation. */
export async function sendToStreamAssist(
  config: Config,
  agentId: string,
  text: string,
  session: string | undefined
): Promise<ForwardResult> {
  const url = `https://discoveryengine.googleapis.com/v1alpha/${config.engine}/assistants/default_assistant:streamAssist?alt=sse`;
  const body = {
    query: { text },
    ...(session ? { session } : {}),
    agentsSpec: { agentSpecs: [{ agentId }] },
    toolsSpec: { webGroundingSpec: {} },
  };
  const { status, text: raw } = await googleRequest('POST', url, config.project, body, TIMEOUT_MS);
  if (status < 200 || status >= 300) throw new GoogleHttpError(status, raw, url);

  return parseAssistChunks(parseStream(raw));
}

/** Accepts SSE (`data: {...}` lines) and, as a fallback, the plain JSON-array framing. */
export function parseStream(raw: string): AssistChunk[] {
  const events = raw
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => JSON.parse(line.slice(5)) as AssistChunk);
  if (events.length > 0) return events;

  const parsed: unknown = JSON.parse(raw);

  return (Array.isArray(parsed) ? parsed : [parsed]) as AssistChunk[];
}

export function parseAssistChunks(chunks: AssistChunk[]): ForwardResult {
  const error = chunks.find((chunk) => chunk.error)?.error;
  if (error) throw new Error(`streamAssist error ${error.code}: ${error.message}`);

  const session = chunks.find((chunk) => chunk.sessionInfo?.session)?.sessionInfo?.session;
  if (!session) throw new Error('streamAssist response has no session');

  const states = chunks.map((chunk) => chunk.answer?.state).filter(Boolean);
  if (states.includes('FAILED')) throw new Error('streamAssist answer state FAILED');

  const text = chunks
    .flatMap((chunk) => chunk.answer?.replies ?? [])
    .map((reply) => reply.groundedContent?.content)
    .filter((content) => content && !content.thought && content.text)
    .map((content) => content!.text!.trim())
    // Deep Research sends each block (greeting, plan, report section) as its own complete reply.
    .join('\n\n')
    .trim();
  if (text) return { kind: 'answer', text, session };

  const skipped = chunks.flatMap((chunk) => chunk.answer?.assistSkippedReasons ?? []);
  if (skipped.length > 0) throw new Error(`streamAssist skipped the turn: ${skipped.join(', ')}`);

  return { kind: 'unreadable', session };
}
