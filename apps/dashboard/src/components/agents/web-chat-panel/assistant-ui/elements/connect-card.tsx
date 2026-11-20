import type { AgentMessage } from '@novu/react';
import { RiCheckLine, RiCloseLine, RiExternalLinkLine } from 'react-icons/ri';
import { McpIcon } from '@/components/agents/mcp-icon';
import { Button } from '@/components/primitives/button';
import { toSafeExternalUrl } from '@/utils/url';

type McpConnectionPart = Extract<AgentMessage['parts'][number], { type: 'mcp-connection' }>;

export function ConnectCard({ part }: { part: McpConnectionPart }) {
  const connectUrl = toSafeExternalUrl(part.authorizeUrl);
  const autoApproveUrl = toSafeExternalUrl(part.authorizeUrlWithAutoApprove);
  const pending = part.state === 'pending';
  const connected = part.state === 'connected';

  if (!pending) {
    return (
      <div
        data-slot="novu-connect-card"
        data-state={part.state}
        id={`mcp-connection-${part.actionId}`}
        className="text-text-soft flex w-fit items-center gap-2 py-1.5 text-sm"
      >
        {connected ? (
          <RiCheckLine className="text-success-base size-4 shrink-0" aria-hidden />
        ) : (
          <RiCloseLine className="size-4 shrink-0" aria-hidden />
        )}
        <span>
          {connected ? 'Connected' : 'Failed to connect'}: <b className="text-text-sub">{part.displayName}</b>
        </span>
      </div>
    );
  }

  return (
    <section
      data-slot="novu-connect-card"
      data-state={part.state}
      id={`mcp-connection-${part.actionId}`}
      className="border-stroke-soft bg-bg-white shadow-regular-xs flex w-full flex-col gap-3.5 rounded-2xl border p-4"
    >
      <div className="flex items-center gap-3">
        <span className="bg-bg-weak ring-stroke-soft flex size-9 shrink-0 items-center justify-center rounded-full ring-1">
          <McpIcon mcpId={part.mcpId} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="text-label-sm text-text-strong truncate font-medium">Connect {part.displayName}</p>
          <p className="text-paragraph-xs text-text-soft">Connection request</p>
        </div>
      </div>

      <p className="bg-bg-weak text-text-sub rounded-xl px-3.5 py-2.5 text-xs leading-relaxed">
        {part.message ?? `Connect your ${part.displayName} account so the agent can continue.`}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {autoApproveUrl ? (
          <Button size="2xs" variant="secondary" mode="outline" asChild>
            <a href={autoApproveUrl} target="_blank" rel="noreferrer">
              Connect & auto-approve
              <RiExternalLinkLine className="size-4" />
            </a>
          </Button>
        ) : null}
        {connectUrl ? (
          <Button size="2xs" variant="primary" mode="filled" asChild>
            <a href={connectUrl} target="_blank" rel="noreferrer">
              Connect
              <RiExternalLinkLine className="size-4" />
            </a>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
