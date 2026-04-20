import { type ReactNode, useId } from 'react';
import { RiArrowLeftSLine, RiMore2Fill } from 'react-icons/ri';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { API_HOSTNAME } from '@/config';

type AgentIntegrationGuideLayoutProps = {
  providerDisplayName: string;
  providerId: string;
  onBack: () => void;
  children: ReactNode;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

function formatCreatedDate(isoDate: string): string {
  const date = new Date(isoDate);

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildWebhookUrl(agentId: string, integrationIdentifier: string): string {
  const baseUrl = (API_HOSTNAME ?? 'https://api.novu.co').replace(/\/$/, '');

  return `${baseUrl}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

export function AgentIntegrationGuideLayout({
  providerDisplayName,
  providerId,
  onBack,
  children,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration = false,
}: AgentIntegrationGuideLayoutProps) {
  const webhookUrlId = useId();
  const isActive = integrationLink?.integration.active ?? false;
  const integrationIdentifier = integrationLink?.integration.identifier;
  const createdAt = integrationLink?.createdAt;
  const webhookUrl = buildWebhookUrl(agent._id, integrationIdentifier ?? 'YOUR_INTEGRATION_IDENTIFIER');

  return (
    <div className="flex w-full flex-col gap-6">
      {!embedded && (
        <CompactButton
          type="button"
          size="lg"
          variant="ghost"
          className="w-fit"
          icon={RiArrowLeftSLine}
          onClick={onBack}
        >
          Back to integrations
        </CompactButton>
      )}

      <header className="flex items-start justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <ProviderIcon
                providerId={providerId}
                providerDisplayName={providerDisplayName}
                className="size-4 shrink-0"
              />
              <span className="text-text-strong text-label-sm font-medium leading-5">{providerDisplayName}</span>
            </div>
            {isActive ? (
              <span className="bg-success-lighter flex items-center gap-1 rounded-md px-1 py-0.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-success-lighter">
                  <span className="bg-success-base size-1.5 rounded-full" />
                </span>
                <span className="text-success-base text-label-xs font-medium leading-4">Active</span>
              </span>
            ) : (
              <span className="bg-error-lighter flex items-center gap-1 rounded-md px-1 py-0.5">
                <span className="bg-error-lighter flex size-4 items-center justify-center rounded-full">
                  <span className="bg-error-base size-1.5 rounded-full" />
                </span>
                <span className="text-error-base text-label-xs font-medium leading-4">Action needed</span>
              </span>
            )}
          </div>

          {integrationIdentifier ? (
            <div className="flex items-center gap-1.5">
              <span className="text-text-sub font-mono text-[12px] leading-4 tracking-tight">
                {integrationIdentifier}
              </span>
              {createdAt ? (
                <>
                  <span className="bg-text-soft size-0.5 shrink-0 rounded-full" />
                  <span className="text-[12px] leading-4">
                    <span className="text-text-soft">Created </span>
                    <span className="text-text-sub font-medium">{formatCreatedDate(createdAt)}</span>
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {integrationLink && canRemoveIntegration && onRequestRemoveIntegration ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                mode="outline"
                size="xs"
                leadingIcon={RiMore2Fill}
                type="button"
                className="text-text-sub size-7 min-w-7 gap-0 px-0"
                disabled={isRemovingIntegration}
              >
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                disabled={isRemovingIntegration}
                onClick={onRequestRemoveIntegration}
              >
                Remove integration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <section className="flex flex-col gap-4">
        <h3 className="text-text-sub text-[11px] font-medium uppercase leading-4 tracking-wider">Agent metadata</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={webhookUrlId} className="text-text-sub text-label-xs font-medium leading-5">
            Webhook URL
          </label>
          <div className="border-stroke-soft bg-bg-white flex h-7 items-center overflow-hidden rounded-md border shadow-xs">
            <input
              id={webhookUrlId}
              type="text"
              readOnly
              value={webhookUrl}
              className="text-text-soft min-w-0 flex-1 truncate bg-transparent px-2 font-mono text-[12px] leading-4 outline-none"
            />
            <CopyButton valueToCopy={webhookUrl} size="xs" className="shrink-0 border-l border-stroke-soft" />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
