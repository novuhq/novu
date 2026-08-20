import type { AgentPlatformContext, AgentTriggerOptions } from './agent.types';

const SLACK_TS = /^\d+\.\d+$/;

export function withInThreadSlackOverrides(
  opts: AgentTriggerOptions | undefined,
  platformContext: AgentPlatformContext
): AgentTriggerOptions | undefined {
  const threadTs = slackThreadTsFromPlatformContext(platformContext);
  if (!threadTs) {
    return opts;
  }

  const slackOverride = opts?.overrides && isPlainRecord(opts.overrides.slack) ? opts.overrides.slack : undefined;

  return {
    ...opts,
    overrides: {
      ...opts?.overrides,
      slack: {
        thread_ts: threadTs,
        ...slackOverride,
      },
    },
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function slackThreadTsFromPlatformContext(platformContext: AgentPlatformContext): string | undefined {
  const threadId = platformContext.threadId?.trim();
  if (!threadId) {
    return undefined;
  }

  if (SLACK_TS.test(threadId)) {
    return threadId;
  }

  const parts = threadId.split(':');
  const encodedTs = parts[0] === 'slack' ? parts[2]?.trim() : undefined;
  if (encodedTs && SLACK_TS.test(encodedTs)) {
    return encodedTs;
  }

  return undefined;
}
