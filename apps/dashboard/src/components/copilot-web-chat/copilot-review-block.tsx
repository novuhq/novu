import type { AgentCardChild } from '@novu/js';
import { CopilotReviewActionEnum, type CopilotWorkflowStepChange } from '@novu/shared';
import { Fragment } from 'react';
import type { IconType } from 'react-icons';
import {
  RiArrowGoBackLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiRefreshLine,
  RiRouteFill,
} from 'react-icons/ri';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { LinkButton } from '@/components/primitives/button-link';
import { useWorkflowEditorRoutes } from '@/components/workflow-editor/use-workflow-editor-routes';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { CopilotChangeRow } from './copilot-change-row';
import { getCardButtonLabel } from './copilot-review-labels';
import { collectChangeRows, getCardTurnSteps } from './copilot-steps';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { type CopilotReviewCardState, RAISED_SURFACE_SHADOW } from './copilot-web-chat-utils';

type CardButtonChild = Extract<AgentCardChild, { type: 'button' }>;

const REVIEW_ACTION_ICONS: Record<CopilotReviewActionEnum, IconType> = {
  [CopilotReviewActionEnum.KEEP]: RiCheckLine,
  [CopilotReviewActionEnum.REVERT]: RiCloseLine,
  [CopilotReviewActionEnum.TRY_AGAIN]: RiRefreshLine,
};

const REVIEW_ACTION_ORDER = [
  CopilotReviewActionEnum.KEEP,
  CopilotReviewActionEnum.REVERT,
  CopilotReviewActionEnum.TRY_AGAIN,
] as const;

function Separator() {
  return (
    <span aria-hidden className="text-label-xs text-text-soft">
      ·
    </span>
  );
}

/** Takes the reader to the canvas, where the changes carry their badges and the review bar its count. */
function useReviewOnCanvas(): (() => void) | undefined {
  const { surface, close } = useCopilotWebChat();
  const { currentEnvironment } = useEnvironment();
  const { workflowSlug } = useParams<{ workflowSlug?: string }>();
  const { editWorkflowRoute } = useWorkflowEditorRoutes();
  const isOnCanvas = !!useMatch(editWorkflowRoute);
  const navigate = useNavigate();
  const environmentSlug = currentEnvironment?.slug;

  // The sidebar sits next to the canvas, so on it the link would do nothing.
  if (!environmentSlug || !workflowSlug || (isOnCanvas && surface !== 'popover')) return undefined;

  return () => {
    if (!isOnCanvas) void navigate(buildRoute(editWorkflowRoute, { environmentSlug, workflowSlug }));
    if (surface === 'popover') close();
  };
}

function SuggestedChanges({ changes }: { changes: CopilotWorkflowStepChange[] }) {
  const { pageContext } = useCopilotWebChat();
  const reviewOnCanvas = useReviewOnCanvas();
  const workflowLabel = pageContext?.workflowId ? pageContext.workflowLabel : undefined;

  return (
    <section
      aria-label="Suggested changes"
      className="flex flex-col rounded-[10px] border border-stroke-white bg-bg-weak p-1"
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <RiRouteFill aria-hidden className="size-3.5 shrink-0 text-text-sub" />
        <p className="min-w-0 flex-1 truncate font-code text-code-xs uppercase text-text-sub">
          {workflowLabel ? `Suggested · ${workflowLabel}` : 'Suggested'}
        </p>
        <p className="shrink-0 font-code text-code-xs uppercase text-text-soft">
          {`${changes.length} ${changes.length === 1 ? 'change' : 'changes'}`}
        </p>
      </div>
      <div className={cn('flex flex-col overflow-hidden rounded-md bg-bg-white', RAISED_SURFACE_SHADOW)}>
        {changes.map((change) => (
          <CopilotChangeRow key={change.stepId} change={change} variant="card" />
        ))}
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <p className="min-w-0 flex-1 truncate text-label-xs text-text-soft">On the canvas until you keep it</p>
        {reviewOnCanvas && (
          <LinkButton
            type="button"
            variant="gray"
            size="sm"
            className="text-label-xs"
            trailingIcon={RiArrowRightSLine}
            onClick={reviewOnCanvas}
          >
            Review on canvas
          </LinkButton>
        )}
      </div>
    </section>
  );
}

function ReviewLinks({
  buttons,
  disabled,
  onClick,
}: {
  buttons: CardButtonChild[];
  disabled: boolean;
  onClick: (button: CardButtonChild) => void;
}) {
  const ordered = REVIEW_ACTION_ORDER.flatMap((actionId) => buttons.filter((button) => button.id === actionId));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ordered.map((button, index) => (
        <Fragment key={button.id}>
          {index > 0 && <Separator />}
          <LinkButton
            type="button"
            variant="black"
            size="sm"
            className="text-label-xs"
            trailingIcon={REVIEW_ACTION_ICONS[button.id as CopilotReviewActionEnum]}
            title={button.tooltip}
            disabled={disabled}
            onClick={() => onClick(button)}
          >
            {getCardButtonLabel(button)}
          </LinkButton>
        </Fragment>
      ))}
    </div>
  );
}

/** What a newer message left of the review: the changes stay, and Revert is offered while their snapshot is. */
function AppliedRow({
  revert,
  disabled,
  onClick,
}: {
  revert?: CardButtonChild;
  disabled: boolean;
  onClick: (button: CardButtonChild) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-label-xs text-text-soft">Changes applied</span>
      {revert && (
        <>
          <Separator />
          <LinkButton
            type="button"
            variant="gray"
            size="sm"
            className="text-label-xs"
            trailingIcon={RiArrowGoBackLine}
            title={revert.tooltip}
            disabled={disabled}
            onClick={() => onClick(revert)}
          >
            Revert
          </LinkButton>
        </>
      )}
    </div>
  );
}

/**
 * The Keep / Revert / Try again card of a turn that changed the workflow, as the design reads it: while it is open,
 * the turn's changes as a Suggested card and quiet Keep all · Discard · Try again links; once another message applied
 * them, `Changes applied · Revert`, or only `Changes applied` once a newer turn's change retired its snapshot.
 */
export function CopilotReviewBlock({
  state,
  buttons,
  sourceMessageId,
}: {
  state: Exclude<CopilotReviewCardState, 'answered'>;
  buttons: CardButtonChild[];
  sourceMessageId: string;
}) {
  const { chat, sendCardAction, pendingReviewMessageId, isBusy, open } = useCopilotWebChat();
  const messages = chat?.messages ?? [];
  const disabled = isBusy || pendingReviewMessageId === sourceMessageId;
  const onClick = (button: CardButtonChild) => {
    void sendCardAction({ actionId: button.id, sourceMessageId, value: button.value });
    // The clicked link locks, so hand the focus back to the composer.
    open();
  };

  switch (state) {
    case 'open': {
      const changes = collectChangeRows(getCardTurnSteps(messages, sourceMessageId));

      return (
        <div className="flex flex-col gap-4">
          <p className="text-label-xs text-text-soft">Suggestions are ready. You can discard them if needed.</p>
          {changes.length > 0 && <SuggestedChanges changes={changes} />}
          <ReviewLinks buttons={buttons} disabled={disabled} onClick={onClick} />
        </div>
      );
    }
    case 'applied':
      return (
        <AppliedRow
          revert={buttons.find((button) => button.id === CopilotReviewActionEnum.REVERT)}
          disabled={disabled}
          onClick={onClick}
        />
      );
    case 'replaced':
      return <AppliedRow disabled onClick={onClick} />;
    default: {
      const unhandled: never = state;

      return unhandled;
    }
  }
}
