import { ToolUIPart } from 'ai';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import { ChainOfThoughtStep } from '../ai-elements/chain-of-thought';
import { Shimmer } from '../ai-elements/shimmer';
import { StyledMessageResponse } from './chat-message-response';

function getToolStatus(state?: string): 'complete' | 'active' | 'pending' {
  if (state === 'output-available') return 'complete';
  if (state === 'streaming' || state === 'partial-call') return 'active';

  return 'pending';
}

type WorkflowCompletionSummary = {
  bestPractices: Array<string>;
  channelRecommendations: Array<{ channel: string; reason: string; priority: number }>;
  summary: string;
};

type WhatsChangedSectionProps = {
  completedToolPart: ToolUIPart;
  onApplyAll?: () => void;
  onDiscard?: () => void;
  onTryAgain?: () => void;
};

export function WhatsChangedSection({ completedToolPart }: WhatsChangedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const status = getToolStatus(completedToolPart.state);

  if (!completedToolPart.input) {
    return null;
  }

  const summary = completedToolPart.input as WorkflowCompletionSummary;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-[#E1E4EA]">
        <button
          type="button"
          className="flex w-full items-center gap-1 border-b border-[#E1E4EA] bg-[#FBFBFB] px-2 py-1.5 text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <RiArrowDownSLine className="size-4 text-text-sub" />
          ) : (
            <RiArrowRightSLine className="size-4 text-text-sub" />
          )}
          <span
            className="text-label-xs font-medium"
            style={{
              background: 'linear-gradient(90deg, #939292 0%, #646464 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            What's changed
          </span>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 bg-[#FBFBFB] py-2 pl-1 pr-2">
                {summary.summary && (
                  <ChainOfThoughtStep
                    label={<Shimmer className="text-label-xs text-text-sub">Workflow Summary</Shimmer>}
                    status={status}
                  >
                    <StyledMessageResponse>{summary.summary}</StyledMessageResponse>
                  </ChainOfThoughtStep>
                )}
                {summary.channelRecommendations?.length > 0 && (
                  <ChainOfThoughtStep
                    label={<Shimmer className="text-label-xs text-text-sub">Step recommendations applied</Shimmer>}
                    status={status}
                  >
                    <StyledMessageResponse>
                      {summary.channelRecommendations
                        .map((channel) => channel.reason)
                        .map((reason) => `\n- ${reason}`)
                        .join('')}
                    </StyledMessageResponse>
                  </ChainOfThoughtStep>
                )}
                {summary.bestPractices?.length > 0 && (
                  <ChainOfThoughtStep
                    label={<Shimmer className="text-label-xs text-text-sub">Best practices</Shimmer>}
                    status={status}
                  >
                    <StyledMessageResponse>
                      {summary.bestPractices.map((bestPractice) => `\n- ${bestPractice}`).join('')}
                    </StyledMessageResponse>
                  </ChainOfThoughtStep>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
