import { RiAlertLine } from 'react-icons/ri';
import { type AgentDemoQuota } from '@/api/agents';
import { Button } from '@/components/primitives/button';

type DemoQuotaBannerProps = {
  quota: AgentDemoQuota;
  onUpgrade: () => void;
};

function getQuotaMessage(quota: AgentDemoQuota): string {
  if (quota.reason === 'tokens') {
    return `This agent hit the demo token limit (${quota.tokens?.count ?? 0}/${quota.tokens?.limit ?? 0} tokens in a conversation).`;
  }

  if (quota.reason === 'conversations') {
    return `This agent hit the demo conversation limit (${quota.conversations.count}/${quota.conversations.limit} this month).`;
  }

  return `Demo usage: ${quota.conversations.count}/${quota.conversations.limit} conversations this month.`;
}

export function DemoQuotaBanner({ quota, onUpgrade }: DemoQuotaBannerProps) {
  if (!quota.isDemoAgent) {
    return null;
  }

  const isWarning = !quota.isExhausted && quota.conversations.count >= Math.max(1, quota.conversations.limit - 2);

  if (!quota.isExhausted && !isWarning) {
    return null;
  }

  return (
    <div className="border-warning/30 bg-warning/5 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start gap-2">
        <RiAlertLine className="text-warning mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-text-strong text-label-sm font-medium">
            {quota.isExhausted ? 'Novu demo quota reached' : 'Novu demo quota almost reached'}
          </span>
          <span className="text-text-sub text-paragraph-xs">{getQuotaMessage(quota)}</span>
          <span className="text-text-soft text-paragraph-xs">
            Add your own Anthropic API key to remove limits and continue production traffic.
          </span>
        </div>
      </div>
      <div>
        <Button variant="secondary" mode="outline" size="xs" onClick={onUpgrade}>
          Use my own Anthropic key
        </Button>
      </div>
    </div>
  );
}
