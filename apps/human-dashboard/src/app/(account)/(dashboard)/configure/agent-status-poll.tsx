'use client';

import { StatusPoll } from '@/components/ui/status-poll';

import { readAgentStatusAction } from './actions';

type AgentStatusPollProps = {
  /** How far the setup got when the page was rendered (`describeAgentStatus`). */
  status: string;
  /** How often to ask. */
  everyMs: number;
};

/** Keeps the Agent page in step with a setup that happens in the operator's terminal. Renders nothing. */
export function AgentStatusPoll({ status, everyMs }: AgentStatusPollProps) {
  return <StatusPoll status={status} read={readAgentStatusAction} everyMs={everyMs} />;
}
