import { PropsWithChildren, useState } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Separator } from '@/components/primitives/separator';
import TruncatedText from '@/components/truncated-text';
import { countIssues, getAllStepIssues } from '@/components/workflow-editor/step-utils';

// Local type definition for step issues until the shared types are updated
type RuntimeIssue = {
  message: string;
  variableName?: string;
  issueType: string;
};

type StepIssue = {
  controls?: Record<string, RuntimeIssue[]>;
  integration?: Record<string, RuntimeIssue[]>;
};

type StepListItem = {
  slug: string;
  type: string;
  issues?: StepIssue;
};

type WorkflowIssuesPopoverProps = PropsWithChildren<{
  steps: StepListItem[];
  className?: string;
}>;

export const WorkflowIssuesPopover = ({ children, steps, className }: WorkflowIssuesPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const stepsWithIssues = steps.filter((step) => step.issues && countIssues(step.issues as any) > 0);

  if (stepsWithIssues.length === 0) {
    return <>{children}</>;
  }

  const totalIssues = stepsWithIssues.reduce((acc, step) => acc + countIssues(step.issues as any), 0);

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setIsOpen(true);
    }, 150); // 300ms delay
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className={className} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <RiErrorWarningFill className="text-destructive size-3.5" />
            <span className="font-medium text-xs">
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''} in {stepsWithIssues.length} step
              {stepsWithIssues.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {stepsWithIssues.map((step, index) => (
              <div key={step.slug}>
                <StepIssueItem step={step} />
                {index < stepsWithIssues.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

type StepIssueItemProps = {
  step: StepListItem;
};

const StepIssueItem = ({ step }: StepIssueItemProps) => {
  const allIssues = getAllStepIssues(step.issues as any);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium capitalize text-foreground-700">{step.type.replace('_', ' ')} Step</span>
      <div className="space-y-1">
        {allIssues.slice(0, 3).map((issue, index) => (
          <div key={index} className="flex items-start gap-1.5">
            <span className="h-1 w-1 rounded-full bg-destructive mt-1.5 shrink-0" />
            <div className="text-xs text-foreground-600 leading-snug">{issue.message}</div>
          </div>
        ))}
        {allIssues.length > 3 && <div className="text-xs text-foreground-400 pl-2.5">+{allIssues.length - 3} more</div>}
      </div>
    </div>
  );
};
