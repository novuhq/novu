import { useMemo, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiCloseLine, RiLoader4Line, RiRobot2Line } from 'react-icons/ri';
import { ConversationActivityDto } from '@/api/conversations';
import { cn } from '@/utils/ui';

type ToolUseSummary = {
  toolUseId: string;
  toolName: string;
  status: string;
  details?: string;
};

function groupToolActivities(activities: ConversationActivityDto[]): ToolUseSummary[] {
  const tools = new Map<string, ToolUseSummary>();

  for (const activity of activities) {
    const payload = activity.signalData?.payload as Record<string, unknown> | undefined;
    if (!payload?.toolUseId) continue;

    const toolUseId = String(payload.toolUseId);
    const existing = tools.get(toolUseId);
    const status = String(payload.status ?? 'running');
    const details = typeof payload.details === 'string' ? payload.details : undefined;

    if (!existing) {
      tools.set(toolUseId, { toolUseId, toolName: String(payload.toolName ?? 'Tool'), status, details });
    } else {
      if (status === 'complete' || status === 'error') {
        existing.status = status;
      }
      if (details && !existing.details) {
        existing.details = details;
      }
    }
  }

  return [...tools.values()];
}

function formatTimestamp(dateStr: string | undefined): string {
  if (!dateStr?.trim()) return '—';

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = String(d.getFullYear()).slice(2);
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return `${day} ${month} ${year}, ${time}`;
}

function ToolStatusIcon({ status }: { status: string }) {
  if (status === 'complete') {
    return <RiCheckLine className="text-success-base size-3 shrink-0" />;
  }
  if (status === 'error') {
    return <RiCloseLine className="text-destructive size-3 shrink-0" />;
  }

  return <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" />;
}

type ToolProgressCardProps = {
  activities: ConversationActivityDto[];
};

export function ToolProgressCard({ activities }: ToolProgressCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tools = useMemo(() => groupToolActivities(activities), [activities]);
  const lastTimestamp = activities[activities.length - 1]?.createdAt;

  if (tools.length === 0) return null;

  const allComplete = tools.every((t) => t.status === 'complete' || t.status === 'error');

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-1 overflow-hidden py-0.5 pl-[11px]"
      >
        <RiRobot2Line className="text-text-soft size-3.5 shrink-0" />
        <span className="text-text-sub text-label-xs font-medium">
          {allComplete ? `Used ${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}` : 'Using tools…'}
        </span>
        <RiArrowDownSLine
          className={cn('text-text-soft size-3.5 shrink-0 transition-transform', expanded && 'rotate-180')}
        />
        <span className="text-text-soft font-code shrink-0 text-[11px] leading-normal">•</span>
        <span className="text-text-soft shrink-0 text-[10px] font-medium leading-[14px]">
          {formatTimestamp(lastTimestamp)}
        </span>
      </button>

      {expanded && (
        <div className="ml-[18px] border-stroke-soft border-l">
          {tools.map((tool) => (
            <div key={tool.toolUseId} className="flex items-center gap-1.5 py-[3px] pl-2.5">
              <ToolStatusIcon status={tool.status} />
              <span className="text-text-sub text-label-xs font-medium truncate">{tool.toolName}</span>
              {tool.details && (
                <span className="text-text-soft text-label-xs min-w-0 truncate font-normal">{tool.details}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
