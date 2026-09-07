import { RuntimeIssue } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { RiAlertFill, RiAlertLine, RiErrorWarningFill, RiErrorWarningLine, RiInformation2Line } from 'react-icons/ri';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
import { getAllStepIssues, isBlockingIssue } from '@/components/workflow-editor/step-utils';
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

function buildSummary(issues: RuntimeIssue[], noun: string): string {
  const [first] = issues;

  if (issues.length <= 1) {
    return first?.message || `${noun} found`;
  }

  return `${first?.message} & ${issues.length - 1}+ ${noun}s`;
}

function IssueList({ issues, tone }: { issues: RuntimeIssue[]; tone: 'error' | 'warning' }) {
  const isError = tone === 'error';

  return (
    <>
      <div className="flex items-center gap-2 pl-1.5">
        {isError ? (
          <RiErrorWarningLine className="size-4 text-red-600" />
        ) : (
          <RiAlertLine className="text-warning size-4" />
        )}
        <span className={cn('text-label-xs font-medium', isError ? 'text-red-600' : 'text-warning')}>
          {isError ? 'Action required' : 'Delivery warnings'}
        </span>
      </div>
      <div className="bg-bg-white max-h-60 overflow-y-auto rounded-[6px] border border-neutral-100 p-2">
        <ul className="space-y-2">
          {issues.map((issue, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-neutral-700">
              <span className={cn('mt-1.5 size-1 shrink-0 rounded-full', isError ? 'bg-red-600' : 'bg-warning')} />
              <span className="text-label-xs text-text-sub font-medium leading-4">{issue.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function IssuesPanel({
  issues,
  className,
  children,
  hintMessage,
  isTranslationEnabled = false,
}: IssuesPanelProps) {
  const defaultHintMessage = isTranslationEnabled
    ? 'Type {{ to access variables or {{t. to access translation keys.'
    : 'Type {{ to access variables.';

  const displayHintMessage = hintMessage || defaultHintMessage;

  const allIssues = getAllStepIssues(issues);
  const errors = allIssues.filter(isBlockingIssue);
  const warnings = allIssues.filter((issue) => !isBlockingIssue(issue));

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  // Warnings are non-blocking, so the trigger only reads as an error when a blocking issue exists.
  const displayText = hasErrors ? buildSummary(errors, 'error') : buildSummary(warnings, 'warning');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'flex min-h-11 items-center overflow-hidden border-t border-neutral-200 bg-white px-4 py-3',
          className
        )}
      >
        {hasErrors || hasWarnings ? (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div
                className={cn(
                  'flex cursor-pointer items-center gap-2 transition-colors',
                  hasErrors ? 'hover:text-red-700' : 'hover:text-warning'
                )}
              >
                {hasErrors ? (
                  <RiErrorWarningFill className="size-4 text-red-600" />
                ) : (
                  <RiAlertFill className="text-warning size-4" />
                )}
                <span className={cn('text-paragraph-xs font-medium', hasErrors ? 'text-red-600' : 'text-warning')}>
                  {displayText}
                </span>
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              className="bg-bg-weak flex w-80 flex-col gap-2 border border-neutral-200 p-1"
              side="top"
              align="start"
              sideOffset={8}
            >
              {hasErrors && (
                <div className="flex flex-col gap-1">
                  <IssueList issues={errors} tone="error" />
                </div>
              )}
              {hasWarnings && (
                <div className="flex flex-col gap-1">
                  <IssueList issues={warnings} tone="warning" />
                </div>
              )}
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
