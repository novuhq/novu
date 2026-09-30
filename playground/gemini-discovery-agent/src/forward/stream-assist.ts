import { type Config, CORE_ASSISTANT_ID } from '../config.ts';
import { googleRequest, httpError } from '../google-auth.ts';
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
  const isCoreAssistant = agentId === CORE_ASSISTANT_ID;
  const body = {
    query: { text },
    ...(session ? { session } : {}),
    ...(isCoreAssistant ? {} : { agentsSpec: { agentSpecs: [{ agentId }] } }),
    toolsSpec: { webGroundingSpec: {} },
  };
  const { status, text: raw } = await googleRequest('POST', url, config.project, body, TIMEOUT_MS);
  if (status < 200 || status >= 300) throw httpError(status, raw, url);

  // The Core Assistant streams fragments of one answer; Deep Research sends each block complete.
  return parseAssistChunks(parseStream(raw), isCoreAssistant ? '' : '\n\n');
}

function parseStream(raw: string): AssistChunk[] {
  return raw
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => JSON.parse(line.slice(5)) as AssistChunk);
}

function parseAssistChunks(chunks: AssistChunk[], separator = '\n\n'): ForwardResult {
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
    .map((content) => (separator ? content!.text!.trim() : content!.text!))
    // Deep Research sends each block (greeting, plan, report section) as its own complete reply.
    .join(separator)
    .trim();
  if (text) return { kind: 'answer', text, session };

  const skipped = chunks.flatMap((chunk) => chunk.answer?.assistSkippedReasons ?? []);
  if (skipped.length > 0) throw new Error(`streamAssist skipped the turn: ${skipped.join(', ')}`);

  return { kind: 'unreadable', session };
}
