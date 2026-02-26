import { RuntimeIssue } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { RiErrorWarningFill, RiErrorWarningLine, RiInformation2Line } from 'react-icons/ri';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
import { countIssues, getAllStepIssues, getFirstErrorMessage } from '@/components/workflow-editor/step-utils';
import { cn } from '@/utils/ui';

type IssuesPanelProps = {
  issues?: {
    controls?: Record<string, RuntimeIssue[]>;
    integration?: Record<string, RuntimeIssue[]>;
  };
  className?: string;
  children?: React.ReactNode;
  hintMessage?: React.ReactNode;
  isTranslationEnabled?: boolean;
};

export function IssuesPanel({
  issues,
  className,
  children,
  hintMessage,
  isTranslationEnabled = false,
}: IssuesPanelProps) {
  const issueCount = countIssues(issues);

  const defaultHintMessage = isTranslationEnabled
    ? 'Type {{ to access variables or {{t. to access translation keys.'
    : 'Type {{ to access variables.';

  const displayHintMessage = hintMessage || defaultHintMessage;

  // Get the first control error message
  const firstControlError = getFirstErrorMessage(issues || {}, 'controls');
  const firstIntegrationError = getFirstErrorMessage(issues || {}, 'integration');
  const firstError = firstControlError || firstIntegrationError;

  const displayText =
    issueCount === 1
      ? firstError?.message || 'Issue found'
      : `${firstError?.message || 'Issues found'} & ${issueCount - 1}+ errors`;

  // Get all issues for the detailed view
  const allIssues = getAllStepIssues(issues);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'flex min-h-[44px] items-center overflow-hidden border-t border-neutral-200 bg-white px-4 py-3',
          className
        )}
      >
        {issueCount > 0 ? (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2 transition-colors hover:text-red-700">
                <RiErrorWarningFill className="size-4 text-red-600" />
                <span className="text-paragraph-xs font-medium text-red-600">{displayText}</span>
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              className="bg-bg-weak flex w-80 flex-col gap-1 border border-neutral-200 p-1"
              side="top"
              align="start"
              sideOffset={8}
            >
              <div className="flex items-center gap-2 pl-1.5">
                <RiErrorWarningLine className="size-4 text-red-600" />
                <span className="text-label-xs font-medium text-red-600">Action required</span>
              </div>
              <div className="bg-bg-white max-h-60 overflow-y-auto rounded-[6px] border border-neutral-100 p-2">
                <ul className="space-y-2">
                  {allIssues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-neutral-700">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red-600" />
                      <span className="text-label-xs text-text-sub font-medium leading-4">{issue.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <div className="flex items-center gap-2">
            <RiInformation2Line className="size-4 text-neutral-500" />
            <span className="text-paragraph-xs text-neutral-600">{displayHintMessage}</span>
          </div>
        )}
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
