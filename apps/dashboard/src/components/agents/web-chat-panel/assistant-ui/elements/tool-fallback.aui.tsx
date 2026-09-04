// biome-ignore-all lint/style/useComponentExportOnlyModules: local tool-fallback pieces
import {
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartStatus,
  useToolCallElapsed,
} from '@assistant-ui/react';
import { memo, useState } from 'react';
import { RiAlertLine, RiArrowDownSLine, RiCheckLine, RiCloseCircleLine, RiLoader4Line } from 'react-icons/ri';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { cn } from '@/utils/ui';

const statusIconMap = {
  running: RiLoader4Line,
  complete: RiCheckLine,
  incomplete: RiCloseCircleLine,
  'requires-action': RiAlertLine,
} as const;

function formatToolDuration(ms: number) {
  if (ms < 1000) return '<1s';
  const seconds = ms / 1000;
  if (seconds < 10) return `${(Math.floor(seconds * 10) / 10).toFixed(1)}s`;
  if (seconds < 60) return `${Math.floor(seconds)}s`;

  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}

function ToolFallbackDuration() {
  const elapsedMs = useToolCallElapsed();
  if (elapsedMs === undefined) return null;

  return <span className="text-text-soft text-xs tabular-nums">{formatToolDuration(elapsedMs)}</span>;
}

function ToolFallbackTrigger({
  toolName,
  status,
  isError,
}: {
  toolName: string;
  status?: ToolCallMessagePartStatus;
  isError?: boolean;
}) {
  const statusType = isError ? 'incomplete' : (status?.type ?? 'complete');
  const isRunning = statusType === 'running';
  const Icon = statusIconMap[statusType];
  const label = isError ? 'Tool error' : isRunning ? 'Running tool' : 'Used tool';

  return (
    <CollapsibleTrigger className="text-text-soft hover:text-text-strong group flex w-fit items-center gap-2 py-1.5 text-sm">
      <Icon className={cn('size-3.5 shrink-0', isRunning && 'animate-spin')} />
      <span className="leading-none">
        {label}: <b className="text-text-sub">{toolName}</b>
      </span>
      <ToolFallbackDuration />
      <RiArrowDownSLine className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}

const ToolFallbackImpl: ToolCallMessagePartComponent = ({ toolName, argsText, result, status, isError, approval }) => {
  const shouldOpen = status?.type === 'requires-action';
  const [open, setOpen] = useState(shouldOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <ToolFallbackTrigger toolName={toolName} status={status} isError={isError} />
      <CollapsibleContent className="overflow-hidden">
        <div className="flex flex-col gap-2 ps-6 pt-1 pb-2">
          {argsText ? (
            <pre className="bg-bg-weak text-text-sub rounded-md p-2.5 text-xs whitespace-pre-wrap">{argsText}</pre>
          ) : null}
          {approval && (approval.approved !== undefined || approval.resolution !== undefined) ? (
            <p className="text-text-soft text-xs">
              {approval.approved ? 'You approved this tool call' : 'You denied this tool call'}
            </p>
          ) : null}
          {result !== undefined ? (
            <pre className="bg-bg-weak text-text-sub rounded-md p-2.5 text-xs whitespace-pre-wrap">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ToolFallback = memo(ToolFallbackImpl) as unknown as ToolCallMessagePartComponent;
ToolFallback.displayName = 'ToolFallback';
