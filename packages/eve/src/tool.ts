import { defineTool } from 'eve/tools';
import type { NovuCredentialsSource } from './credentials.js';
import { NovuApiClient, type TriggerRecipient } from './reply-client.js';

export interface NovuToolOptions {
  /** Shown to the model so it knows when to fire this workflow. */
  readonly description: string;
  /** Novu workflow identifier to trigger (same id used in `workflow(...)`). */
  readonly workflow: string;
  /**
   * Input schema for the tool (a Standard Schema, e.g. a Zod schema). The tool
   * input may carry `to` (recipient override) and `payload`; anything else is
   * forwarded as the workflow payload. Defaults to an open object.
   */
  readonly inputSchema?: unknown;
  /** Credentials source. Defaults to env. */
  readonly credentials?: NovuCredentialsSource;
  /** Injectable fetch (tests). */
  readonly fetch?: typeof fetch;
}

const DEFAULT_INPUT_SCHEMA = { type: 'object', additionalProperties: true };

/**
 * Authors an Eve tool the model can call to fire a Novu workflow — the
 * model-driven "trigger + execute user code" path. Gate it with Eve's
 * `needsApproval` on the tool file if you want a confirmation step.
 *
 * The tool stays pure: it performs a single side effect (the trigger) and
 * returns an ack the model can reason over. The recipient defaults to the
 * conversation's subscriber when the model omits `to`.
 */
export function novuTool(options: NovuToolOptions) {
  const client = new NovuApiClient(options.credentials ?? {}, options.fetch);

  return defineTool({
    description: options.description,
    inputSchema: (options.inputSchema ?? DEFAULT_INPUT_SCHEMA) as never,
    async execute(input: Record<string, unknown>) {
      const to = input.to as TriggerRecipient | undefined;
      const payload = (input.payload as Record<string, unknown> | undefined) ?? input;
      await client.trigger(options.workflow, { to, payload });
      return { triggered: true, workflow: options.workflow };
    },
  });
}
