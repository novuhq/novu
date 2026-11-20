import { useId, useState } from 'react';
import { RiCheckboxCircleFill, RiCloseCircleFill, RiExpandUpDownLine, RiUserVoiceLine } from 'react-icons/ri';
import { ConversationActivityDto, ConversationHumanInteractionData } from '@/api/conversations';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatToolInputPreview, getHitlTimelineLabel, getHumanInteraction } from './conversation-hitl';

type HitlTimelineRowProps = {
  activity: ConversationActivityDto;
  formatTimestamp: (dateStr: string | undefined) => string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="text-text-soft shrink-0 font-code text-[10px] font-medium tracking-tight">{label}</span>
      <span className="text-text-sub min-w-0 text-right text-[11px] font-medium wrap-break-word">{value}</span>
    </div>
  );
}

function HitlStatusIcon({ isDenied, isPositive }: { isDenied: boolean; isPositive: boolean }) {
  if (isDenied) {
    return <RiCloseCircleFill className="text-error-base size-3.5 shrink-0" />;
  }

  if (isPositive) {
    return <RiCheckboxCircleFill className="text-success-base size-3.5 shrink-0" />;
  }

  return <RiUserVoiceLine className="text-text-soft size-3.5 shrink-0" />;
}

function HitlDetails({
  activity,
  human,
  isResponse,
  actor,
}: {
  activity: ConversationActivityDto;
  human: ConversationHumanInteractionData | undefined;
  isResponse: boolean;
  actor: string;
}) {
  const toolInput = formatToolInputPreview(activity.toolData?.input);
  const hasToolInput = Boolean(activity.toolData?.input && Object.keys(activity.toolData.input).length > 0);
  const optionId = activity.toolData?.optionId ?? human?.optionId;

  return (
    <div className="border-stroke-soft bg-bg-weak mt-1.5 mr-1 rounded-md border px-2 py-1.5">
      {activity.toolData?.toolName && <DetailRow label="Tool" value={activity.toolData.toolName} />}
      {activity.toolData?.mcpServerName && <DetailRow label="MCP server" value={activity.toolData.mcpServerName} />}
      {human?.kind && <DetailRow label="Kind" value={human.kind} />}
      {human?.title && <DetailRow label="Title" value={human.title} />}
      {human?.subtitle && <DetailRow label="Subtitle" value={human.subtitle} />}
      {human?.body && <DetailRow label="Body" value={human.body} />}
      {isResponse && <DetailRow label="Responded by" value={actor} />}
      {human?.status && <DetailRow label="Status" value={human.status} />}
      {optionId && <DetailRow label="Option" value={optionId} />}
      {human?.text && <DetailRow label="Reply" value={human.text} />}
      {hasToolInput && (
        <pre className="text-text-sub mt-1 max-h-40 overflow-auto font-mono text-[10px] leading-4 whitespace-pre-wrap">
          {toolInput}
        </pre>
      )}
    </div>
  );
}

function hasHitlDetails(
  activity: ConversationActivityDto,
  human: ConversationHumanInteractionData | undefined,
  isResponse: boolean,
  actor: string
): boolean {
  const hasToolInput = Boolean(activity.toolData?.input && Object.keys(activity.toolData.input).length > 0);

  return Boolean(
    activity.toolData?.toolName ||
      hasToolInput ||
      activity.toolData?.optionId ||
      human?.kind ||
      human?.title ||
      human?.body ||
      human?.text ||
      human?.optionId ||
      human?.status ||
      (isResponse && actor)
  );
}

export function HitlTimelineRow({ activity, formatTimestamp }: HitlTimelineRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const human = getHumanInteraction(activity);
  const isResponse = activity.type === 'tool_approval_decision' || activity.type === 'human_interaction_response';
  const isDenied = activity.toolData?.approved === false || human?.status === 'denied' || human?.status === 'canceled';
  const isPositive =
    activity.toolData?.approved === true ||
    human?.status === 'approved' ||
    human?.status === 'answered' ||
    human?.status === 'delivered';
  const label = getHitlTimelineLabel(activity);
  const actor = activity.senderName ?? activity.senderId;
  const showDetails = hasHitlDetails(activity, human, isResponse, actor);

  return (
    <div className="flex flex-col py-0.5 pl-[11px]">
      <div className="flex items-center gap-1 overflow-hidden">
        <HitlStatusIcon isDenied={isDenied} isPositive={isPositive} />
        <span className="text-text-sub text-label-xs min-w-0 truncate font-medium">{label}</span>
        <span className="text-text-soft font-code shrink-0 text-[11px] leading-normal">•</span>
        <TimeDisplayHoverCard
          date={activity.createdAt}
          className="text-text-soft shrink-0 text-[10px] font-medium leading-[14px]"
        >
          {formatTimestamp(activity.createdAt)}
        </TimeDisplayHoverCard>
        {showDetails && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((current) => !current)}
            className="text-text-soft hover:text-text-sub ml-auto flex shrink-0 cursor-pointer items-center gap-0.5 transition-colors"
          >
            <RiExpandUpDownLine className="size-3.5" />
            <span className="text-[10px] font-medium leading-[14px]">{expanded ? 'Hide details' : 'Details'}</span>
          </button>
        )}
      </div>
      {expanded && showDetails && (
        <div id={detailsId}>
          <HitlDetails activity={activity} human={human} isResponse={isResponse} actor={actor} />
        </div>
      )}
    </div>
  );
}
