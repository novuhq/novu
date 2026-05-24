import { RiAlertLine, RiInformationLine } from 'react-icons/ri';
import { type AgentDemoQuota } from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';

type DemoQuotaBannerProps = {
  quota: AgentDemoQuota;
  onUpgrade: () => void;
};

function getAlertQuotaMessage(quota: AgentDemoQuota): string {
  if (quota.reason === 'tokens') {
    return `This agent hit the demo token limit (${quota.tokens?.count ?? 0}/${quota.tokens?.limit ?? 0} tokens in a conversation).`;
  }

  if (quota.reason === 'conversations') {
    return `This agent hit the demo conversation limit (${quota.conversations.count}/${quota.conversations.limit} this month).`;
  }

  return `Demo usage: ${quota.conversations.count}/${quota.conversations.limit} conversations this month.`;
}

function getInfoQuotaMessage(quota: AgentDemoQuota): string {
  const conversationUsage = `${quota.conversations.count}/${quota.conversations.limit} conversations this month`;

  if (quota.tokens?.limit) {
    return `Demo usage: ${conversationUsage}, up to ${quota.tokens.limit.toLocaleString()} tokens per conversation.`;
  }

  return `Demo usage: ${conversationUsage}.`;
}

export function DemoQuotaBanner({ quota, onUpgrade }: DemoQuotaBannerProps) {
  if (!quota.isDemoAgent) {
    return null;
  }

  const isNearLimit = !quota.isExhausted && quota.conversations.count >= Math.max(1, quota.conversations.limit - 2);
  const isAlert = quota.isExhausted || isNearLimit;

  const title = quota.isExhausted
    ? 'Novu demo quota reached'
    : isNearLimit
      ? 'Novu demo quota almost reached'
      : 'Running on Novu demo Claude';

  const description = isAlert
    ? getAlertQuotaMessage(quota)
    : getInfoQuotaMessage(quota);

  const helperText = isAlert
    ? 'Add your own Anthropic API key to remove limits and continue production traffic.'
    : 'Connect your Anthropic account when you are ready to move off demo limits.';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4',
        isAlert ? 'border-warning/30 bg-warning/5' : 'border-stroke-weak bg-bg-weak'
      )}
    >
      <div className="flex items-start gap-2">
        {isAlert ? (
          <RiAlertLine className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
        ) : (
          <RiInformationLine className="text-text-soft mt-0.5 size-4 shrink-0" aria-hidden="true" />
        )}
        <div className="flex flex-col gap-1">
          <span className="text-text-strong text-label-sm font-medium">{title}</span>
          <span className="text-text-sub text-paragraph-xs">{description}</span>
          <span className="text-text-soft text-paragraph-xs">{helperText}</span>
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
