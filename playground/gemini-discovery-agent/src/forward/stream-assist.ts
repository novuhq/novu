import { config } from '../config.ts';
import { googlePost } from '../google.ts';
import type { AgentReply } from './index.ts';

/** A Deep Research report took 484 s in the sandbox. */
const TIMEOUT_MS = 20 * 60_000;
/** The Gemini Enterprise assistant itself (web search): called with no agentsSpec. */
const CORE_ASSISTANT_ID = 'default_assistant';

type AssistChunk = {
  error?: { code?: number; message?: string };
  sessionInfo?: { session?: string };
  answer?: {
    assistSkippedReasons?: string[];
    replies?: Array<{ groundedContent?: { content?: { text?: string; thought?: boolean } } }>;
  };
};

/** streamAssist for Google-made agents (Deep Research, the Core Assistant). Streams SSE `data:` lines. */
export async function askStreamAssist(agentId: string, text: string, session: string | undefined): Promise<AgentReply> {
  const url = `https://discoveryengine.googleapis.com/v1alpha/${config.engine}/assistants/default_assistant:streamAssist?alt=sse`;
  const isCoreAssistant = agentId === CORE_ASSISTANT_ID;
  const body = {
    query: { text },
    session,
    agentsSpec: isCoreAssistant ? undefined : { agentSpecs: [{ agentId }] },
    toolsSpec: { webGroundingSpec: {} },
  };

  const chunks: AssistChunk[] = (await googlePost(url, body, TIMEOUT_MS))
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => JSON.parse(line.slice(5)));

  const error = chunks.find((chunk) => chunk.error)?.error;
  if (error) throw new Error(`streamAssist error ${error.code}: ${error.message}`);

  const newSession = chunks.find((chunk) => chunk.sessionInfo?.session)?.sessionInfo?.session;
  if (!newSession) throw new Error('streamAssist response has no session');

  const skipped = chunks.flatMap((chunk) => chunk.answer?.assistSkippedReasons ?? []);
  if (skipped.length) throw new Error(`streamAssist skipped the turn: ${skipped.join(', ')}`);

  const parts = chunks
    .flatMap((chunk) => chunk.answer?.replies ?? [])
    .map((reply) => reply.groundedContent?.content)
    .filter((content) => content?.text && !content.thought)
    .map((content) => content!.text!);
  // The Core Assistant streams fragments of one answer; Deep Research sends each block (plan, report section) whole.
  const answer = (isCoreAssistant ? parts.join('') : parts.map((part) => part.trim()).join('\n\n')).trim();

  return { text: answer || undefined, session: newSession };
}
