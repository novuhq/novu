import { RiCloudLine, RiServerLine } from 'react-icons/ri';
import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import type { AgentRuntime } from '@novu/shared';
import { Badge } from '@/components/primitives/badge';

type AgentRuntimeBadgeProps = {
  runtime?: AgentRuntime;
  providerId?: string;
  className?: string;
};

export function AgentRuntimeBadge({ runtime, providerId, className }: AgentRuntimeBadgeProps) {
  if (!runtime || runtime === 'self-hosted') {
    return (
      <Badge color="gray" size="sm" variant="lighter" className={className}>
        <RiServerLine className="mr-1 size-3" />
        Self-hosted
      </Badge>
    );
  }

  const providerEntry = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === providerId);
  const displayName = providerEntry?.displayName ?? 'Managed';

  return (
    <Badge color="purple" size="sm" variant="lighter" className={className}>
      <RiCloudLine className="mr-1 size-3" />
      {displayName}
    </Badge>
  );
}
