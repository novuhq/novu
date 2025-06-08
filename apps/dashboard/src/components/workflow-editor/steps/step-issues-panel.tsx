import { StepResponseDto } from '@novu/shared';
import { RiErrorWarningLine, RiCloseLine, RiErrorWarningFill } from 'react-icons/ri';
import { motion, AnimatePresence } from 'motion/react';
import { countStepIssues, getFirstErrorMessage, getAllStepIssues } from '@/components/workflow-editor/step-utils';
import { cn } from '@/utils/ui';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';

type StepIssuesPanelProps = {
  step: StepResponseDto;
  className?: string;
};

export function StepIssuesPanel({ step, className }: StepIssuesPanelProps) {
  const issueCount = countStepIssues(step.issues);

  // Get the first control error message
  const firstControlError = getFirstErrorMessage(step.issues || {}, 'controls');
  const firstIntegrationError = getFirstErrorMessage(step.issues || {}, 'integration');
  const firstError = firstControlError || firstIntegrationError;

  const displayText =
    issueCount === 1
      ? firstError?.message || 'Issue found'
      : `${firstError?.message || 'Issues found'} & ${issueCount - 1}+ errors`;

  // Get all issues for the detailed view
  const allIssues = getAllStepIssues(step.issues);

  return (
    <AnimatePresence mode="wait">
      {issueCount > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0.0, 0.2, 1],
            opacity: { duration: 0.2 },
          }}
          className={cn(
            'flex min-h-[44px] items-center overflow-hidden border-t border-neutral-200 bg-white px-4 py-3',
            className
          )}
        >
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.2, ease: 'easeOut' }}
                className="flex cursor-pointer items-center gap-1"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.2, ease: 'backOut' }}
                >
                  <RiErrorWarningFill className="size-4 text-red-600" />
                </motion.div>
                <span className="text-paragraph-xs font-medium text-red-600">{displayText}</span>
              </motion.div>
            </HoverCardTrigger>
            <HoverCardContent
              className="bg-bg-weak flex w-80 flex-col gap-1 border border-neutral-200 p-1"
              side="top"
              align="start"
              sideOffset={8}
            >
              <div className="">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiErrorWarningLine className="ml-1 size-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Action required</span>
                  </div>
                </div>
              </div>
              <div className="bg-bg-white max-h-60 overflow-y-auto rounded-[6px] border border-neutral-100 p-1">
                <ul className="">
                  {allIssues.map((issue, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2, ease: 'easeOut' }}
                      className="flex items-start gap-1 py-1 text-sm text-neutral-700"
                    >
                      <span className="ml-1 mr-1 mt-1.5 size-1 shrink-0 rounded-full bg-red-600" />
                      <span className="text-label-xs text-text-sub font-medium leading-4">{issue.message}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </HoverCardContent>
          </HoverCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
