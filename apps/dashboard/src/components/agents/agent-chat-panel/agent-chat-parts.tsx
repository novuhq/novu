import type { AgentMessage, AgentPendingAction } from '@novu/react';
import {
  RiChat3Fill,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiLoader4Line,
  RiShieldCheckLine,
  RiToolsLine,
} from 'react-icons/ri';
import { McpIcon } from '@/components/agents/mcp-icon';
import { Button } from '@/components/primitives/button';
import { MarkdownText } from '@/components/primitives/markdown-text';
import { cn } from '@/utils/ui';

const STARTER_PROMPTS = ['Hello', 'What can you do?', 'List my MCP tools'] as const;

function stripPoweredByWatermark(text: string): string {
  return text
    .replace(
      /(?:\n+)?(?:Powered by \[Novu\]\([^)]+\)|Powered by <https?:\/\/[^|>]+\|Novu>|\[Powered by Novu\]\([^)]+\)|Powered by Novu\u200B?)\s*$/i,
      ''
    )
    .trimEnd();
}

type AgentMessagePart = AgentMessage['parts'][number];
type ToolPart = Extract<AgentMessagePart, { type: 'tool' }>;
type TextPart = Extract<AgentMessagePart, { type: 'text' }>;

function formatMessageTime(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function AgentAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'from-primary-base to-error-base flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br',
        className
      )}
      aria-hidden
    >
      <RiChat3Fill className="text-static-white size-3.5" />
    </span>
  );
}

export function ChatEmptyState({ onPickStarter }: { onPickStarter: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-10 text-center">
      <div
        className="from-primary-base to-error-base flex size-12 items-center justify-center rounded-2xl bg-linear-to-br shadow-[0_12px_24px_-8px_hsl(var(--primary-alpha-24)),inset_0_1px_0_hsl(var(--white-alpha-24))]"
        aria-hidden
      >
        <RiChat3Fill className="text-static-white size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-label-md text-text-strong font-medium">Your agent is ready</p>
        <p className="text-paragraph-xs text-text-soft max-w-xs leading-5">Send a message to see how it replies.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="secondary"
            mode="outline"
            size="2xs"
            className="rounded-full px-3"
            onClick={() => onPickStarter(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ChatMessageRow({ message, showAvatar }: { message: AgentMessage; showAvatar: boolean }) {
  const isUser = message.role === 'user';
  const textParts = message.parts.filter((part): part is TextPart => part.type === 'text');
  const text = stripPoweredByWatermark(textParts.map((part) => part.text).join(''));
  const isStreaming = textParts.some((part) => part.state === 'streaming');
  const tools = message.parts.filter((part): part is ToolPart => part.type === 'tool');
  const time = formatMessageTime(message.createdAt);
  const failed = message.status === 'failed';

  if (isUser) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-1 group flex flex-col items-end gap-1 duration-200">
        <div className="flex max-w-full items-end justify-end gap-2">
          {time ? (
            <span className="text-text-soft shrink-0 text-[11px] tabular-nums opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {time}
            </span>
          ) : null}
          <div
            className={cn(
              'bg-bg-weak text-text-strong text-paragraph-sm max-w-[min(30rem,85%)] whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-3.5 py-2 leading-5',
              failed && 'ring-error-light ring-1'
            )}
          >
            {text}
          </div>
        </div>
        {failed ? (
          <span className="text-error-base text-label-xs inline-flex items-center gap-1">
            <RiErrorWarningLine className="size-3" aria-hidden />
            Not sent
          </span>
        ) : null}
      </div>
    );
  }

  const hasContent = Boolean(text) || tools.length > 0;
  if (!hasContent) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 group flex items-start gap-2.5 duration-200">
      {showAvatar ? <AgentAvatar className="mt-0.5" /> : <div className="w-7 shrink-0" aria-hidden />}
      <div className="flex min-w-0 max-w-[min(34rem,calc(100%-3rem))] flex-col items-start gap-1.5">
        {text ? (
          <div className="border-stroke-soft bg-bg-white shadow-regular-xs text-paragraph-sm text-text-strong rounded-2xl rounded-tl-md border px-3.5 py-2.5 leading-5">
            <MarkdownText className="text-paragraph-sm leading-5">{text}</MarkdownText>
            {isStreaming ? (
              <span className="bg-text-strong ml-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle" aria-hidden />
            ) : null}
          </div>
        ) : null}
        {tools.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <ToolChip key={tool.toolUseId} tool={tool} />
            ))}
          </div>
        ) : null}
      </div>
      {time ? (
        <span className="text-text-soft mt-2 shrink-0 self-start text-[11px] tabular-nums opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {time}
        </span>
      ) : null}
    </div>
  );
}

function ToolChip({ tool }: { tool: ToolPart }) {
  const isRunning = tool.state === 'input-streaming' || tool.state === 'input-available';
  const isFailed = tool.state === 'output-error';

  return (
    <span
      className={cn(
        'text-label-xs inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium',
        isFailed ? 'border-error-light bg-red-alpha-10 text-error-base' : 'border-stroke-soft bg-bg-weak text-text-sub'
      )}
    >
      {isRunning ? (
        <RiLoader4Line className="size-3 shrink-0 animate-spin" aria-hidden />
      ) : isFailed ? (
        <RiErrorWarningLine className="size-3 shrink-0" aria-hidden />
      ) : (
        <RiToolsLine className="size-3 shrink-0" aria-hidden />
      )}
      {isRunning ? 'Running' : isFailed ? 'Failed' : 'Used'}: <span className="font-mono">{tool.toolName}</span>
    </span>
  );
}

export function ChatTypingRow({ status }: { status?: string }) {
  // Server statuses often arrive with their own trailing ellipsis or dots.
  const label = status?.trim().replace(/[.\u2026]+$/, '');

  return (
    <output
      className="animate-in fade-in slide-in-from-bottom-1 flex items-start gap-2.5 duration-200"
      aria-label={label || 'Agent is typing'}
    >
      <AgentAvatar className="mt-0.5" />
      <span className="border-stroke-soft bg-bg-white shadow-regular-xs flex h-9 items-center rounded-2xl rounded-tl-md border px-3.5">
        {label ? (
          <span className="text-label-xs text-text-soft animate-pulse">{label}…</span>
        ) : (
          <span className="flex items-center gap-1" aria-hidden>
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="bg-text-soft size-1.5 animate-bounce rounded-full"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        )}
      </span>
    </output>
  );
}

export function ChatPendingActionCard({
  action,
  disabled,
  onRespond,
}: {
  action: AgentPendingAction;
  disabled: boolean;
  onRespond: (decision: 'approved' | 'denied') => void;
}) {
  if (action.type === 'mcp-connection') {
    const authorizeUrl = action.authorizeUrlWithAutoApprove || action.authorizeUrl;

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 border-stroke-soft bg-bg-white shadow-regular-xs flex flex-wrap items-center gap-3 rounded-xl border p-3 duration-200">
        <div className="bg-bg-weak ring-stroke-soft flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <McpIcon mcpId={action.mcpId} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label-xs text-text-strong truncate font-medium">Connect {action.displayName}</p>
          <p className="text-label-xs text-text-soft">The agent needs authorization to continue.</p>
        </div>
        <Button
          type="button"
          size="2xs"
          variant="primary"
          className="shrink-0"
          trailingIcon={RiExternalLinkLine}
          disabled={!authorizeUrl}
          onClick={() => {
            if (!authorizeUrl) return;
            window.open(authorizeUrl, '_blank', 'noopener,noreferrer');
          }}
        >
          Authorize
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 border-stroke-soft bg-bg-white shadow-regular-xs flex items-center gap-3 rounded-xl border p-3 duration-200">
      <div className="bg-warning/10 flex size-8 shrink-0 items-center justify-center rounded-full">
        <RiShieldCheckLine className="text-warning size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-label-xs text-text-strong truncate font-medium">
          Run <span className="font-mono">{action.toolName}</span>?
        </p>
        <p className="text-label-xs text-text-soft">The agent is waiting for your approval.</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button
          type="button"
          size="2xs"
          variant="secondary"
          mode="outline"
          disabled={disabled}
          onClick={() => onRespond('denied')}
        >
          Deny
        </Button>
        <Button type="button" size="2xs" variant="primary" disabled={disabled} onClick={() => onRespond('approved')}>
          Approve
        </Button>
      </div>
    </div>
  );
}
