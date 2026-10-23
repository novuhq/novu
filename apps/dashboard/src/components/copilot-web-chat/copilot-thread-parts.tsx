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
      <div className="max-w-[352px] whitespace-pre-wrap break-words rounded-2xl rounded-tr-[4px] bg-[#f4f4f5] px-3 py-2 text-xs leading-4 text-text-strong">
        {text}
      </div>
    </div>
  );
}

function ThinkingBlock({ block }: { block: Extract<AssistantBlock, { kind: 'thinking' }> }) {
  const [open, setOpen] = useState(false);
  const startedAt = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!block.streaming) {
      setSeconds(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
    }
  }, [block.streaming]);

  if (block.streaming) {
    return <div className="animate-pulse text-xs leading-4 text-text-soft">Thinking…</div>;
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
              className="text-xs leading-4 text-text-strong [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4"
            >
              <MessageResponse>{block.text}</MessageResponse>
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
