import { ForbiddenException } from '@nestjs/common';

/** Machine-readable code on the error a paused agent's host gets, so the CLI and MCP can tell it apart. */
export const AGENT_PAUSED = 'agent_paused';

/** What a host of a paused Agent Inbox agent gets, whichever endpoint it calls to read or send. */
export function agentPausedError(pausedAt: string): ForbiddenException {
  return new ForbiddenException({
    code: AGENT_PAUSED,
    message:
      'This agent is paused: it can’t read its inbox or send until its operator resumes it on agentinbox.md. Messages people send meanwhile wait in the inbox.',
    pausedAt,
  });
}
