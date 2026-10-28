import type { AgentMessage } from '@novu/js';
import { useEffect, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiLoader4Line,
  RiRefreshLine,
} from 'react-icons/ri';
import { MessageResponse } from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/utils/ui';
import {
  type AssistantBlock,
  buildAssistantBlocks,
  getUserMessageText,
  summarizeToolGroup,
  type ToolChange,
  type ToolRow,
} from './copilot-web-chat-utils';

const CHANGE_STYLES: Record<ToolChange, string> = {
  Added: 'bg-[#1fc16b]/10 text-[#1fc16b]',
  Edited: 'bg-[#335cff]/10 text-[#335cff]',
  Removed: 'bg-[#fb3748]/10 text-[#fb3748]',
  Moved: 'bg-[#7d52f4]/10 text-[#7d52f4]',
};

export function CopilotUserMessage({ message, contextLabel }: { message: AgentMessage; contextLabel?: string }) {
  const text = getUserMessageText(message);

  return (
    <div className="flex flex-col items-end gap-1">
      {contextLabel && (
        <span className="rounded-md bg-bg-weak px-1.5 py-0.5 font-mono text-[10px] leading-4 text-text-sub">
          {contextLabel}
        </span>
      )}
      <div
        className={cn(
          'max-w-[352px] whitespace-pre-wrap break-words rounded-2xl rounded-tr-[4px] bg-[#f4f4f5] px-3 py-2 text-xs leading-4 text-text-strong',
          message.status === 'failed' && 'opacity-60'
        )}
      >
        {text}
      </div>
    </div>
  );
}

/** Animated dot grid; the pulse sweeps diagonally (delay grows with row + column). */
export function DotGrid({ columns, stepMs, className }: { columns: number; stepMs: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-content-center gap-px', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns * columns }, (_, index) => (
        <span
          key={index}
          className="size-0.5 animate-pulse rounded-full bg-text-sub motion-reduce:animate-none"
          style={{ animationDelay: `${(Math.floor(index / columns) + (index % columns)) * stepMs}ms` }}
        />
      ))}
    </span>
  );
}

/** Shown from a send until the agent produces content, and while its reasoning streams. */
export function CopilotThinkingIndicator({ label = 'Thinking…' }: { label?: string }) {
  return (
    <output className="flex items-center gap-2 text-xs leading-4 text-text-soft">
      <DotGrid columns={4} stepMs={150} className="size-3" />
      <Shimmer key={label} as="span" className="text-xs leading-4">
        {label}
      </Shimmer>
    </output>
  );
}

function ThinkingBlock({ block }: { block: Extract<AssistantBlock, { kind: 'thinking' }> }) {
  const [open, setOpen] = useState(false);
  // Only measured while observed streaming; blocks mounted already finished (popover reopened) show "Thought".
  const startedAt = useRef<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  if (block.streaming && startedAt.current === null) startedAt.current = Date.now();

  useEffect(() => {
    if (!block.streaming && startedAt.current !== null) {
      setSeconds(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
    }
  }, [block.streaming]);

  if (block.streaming) {
    return (
      <div className="flex flex-col gap-1">
        <CopilotThinkingIndicator />
        {block.text.trim() && (
          <div className="flex max-h-24 flex-col justify-end overflow-hidden border-l border-stroke-soft pl-3">
            <p className="whitespace-pre-wrap text-xs leading-4 text-text-soft">{block.text}</p>
          </div>
        )}
      </div>
    );
  }

  if (!block.text.trim()) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-fit items-center gap-1 text-xs leading-4 text-text-soft hover:text-text-sub"
      >
        {open ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowRightSLine className="size-3.5" />}
        {seconds > 0 ? `Thought for ${seconds}s` : 'Thought'}
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-l border-stroke-soft pl-3 text-xs leading-4 text-text-soft">
          {block.text}
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: ToolRow['status'] }) {
  if (status === 'done') return <RiCheckboxCircleFill className="size-3.5 text-success-base" />;
  if (status === 'error') return <RiCloseCircleFill className="size-3.5 text-error-base" />;
  if (status === 'active') return <RiLoader4Line className="size-3.5 animate-spin text-text-sub" />;

  return <span className="size-2.5 rounded-full border border-stroke-soft" />;
}

function ToolRowView({ row }: { row: ToolRow }) {
  return (
    <div className="flex h-6 items-center gap-2">
      <span className="flex w-3.5 shrink-0 justify-center">
        <StatusIcon status={row.status} />
      </span>
      <span className={cn('truncate text-xs leading-4', row.status === 'done' ? 'text-text-soft' : 'text-text-sub')}>
        {row.label}
      </span>
      {row.arg && (
        <span className="max-w-[120px] truncate rounded bg-bg-weak px-1 font-mono text-[10px] leading-4 text-text-sub">
          {row.arg}
        </span>
      )}
      {row.change && row.status === 'done' && (
        <span className={cn('rounded px-1 text-[10px] font-medium leading-4', CHANGE_STYLES[row.change])}>
          {row.change}
        </span>
      )}
    </div>
  );
}

function ToolGroup({ block }: { block: Extract<AssistantBlock, { kind: 'tools' }> }) {
  const summary = summarizeToolGroup(block.rows);
  const [userOpen, setUserOpen] = useState<boolean | undefined>();
  const expanded = userOpen ?? summary.isRunning;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setUserOpen(!expanded)}
        aria-expanded={expanded}
        className="flex w-fit items-center gap-1 text-xs leading-4 text-text-sub hover:text-text-strong"
      >
        {expanded ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowRightSLine className="size-3.5" />}
        <span className={cn(summary.isRunning && 'animate-pulse')}>{summary.title}</span>
      </button>
      {expanded && (
        <div className="ml-[7px] mt-1 flex flex-col border-l border-stroke-soft pl-2.5">
          {block.rows.map((row) => (
            <ToolRowView key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CopilotAssistantMessage({ message }: { message: AgentMessage }) {
  const blocks = buildAssistantBlocks(message);

  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block) => {
        if (block.kind === 'text') {
          return (
            <div
              key={block.key}
              className="text-xs leading-4 text-text-strong [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-4"
            >
              <MessageResponse>{block.text}</MessageResponse>
              {block.streaming && (
                <span aria-hidden className="inline-block h-3.5 w-[7px] animate-pulse bg-text-strong align-middle" />
              )}
            </div>
          );
        }

        if (block.kind === 'thinking') return <ThinkingBlock key={block.key} block={block} />;

        return <ToolGroup key={block.key} block={block} />;
      })}
    </div>
  );
}

export function CopilotErrorNotice({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-1.5 text-xs leading-4 text-text-sub">
      <span>That didn't go as planned</span>
      {onRetry && (
        <>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={onRetry} className="flex items-center gap-1 text-text-strong hover:underline">
            <RiRefreshLine className="size-3" />
            Retry
          </button>
        </>
      )}
    </div>
  );
}
