import { motion } from 'motion/react';
import { RiFullscreenLine, RiCloseFill } from 'react-icons/ri';
import { IActivity } from '@novu/shared';
import { useState, useRef } from 'react';

import { cn } from '@/utils/ui';
import { InlineToast } from '@/components/primitives/inline-toast';
import { ActivityJobItem } from '@/components/activity/activity-job-item';
import { fadeIn } from '@/utils/animation';
import { Popover, PopoverContent } from '@/components/primitives/popover';
import { CodeBlock } from '@/components/primitives/code-block';
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogHeader } from '@/components/primitives/dialog';
import { CopyToClipboard } from '../primitives/copy-to-clipboard';
import { CompactButton } from '../primitives/button-compact';
import { CollapsibleSection } from '../http-logs/logs-detail-content';

export function ActivityLogs({
  activity,
  className,
  onActivitySelect,
  children,
}: {
  activity: IActivity;
  className?: string;
  onActivitySelect: (activityId: string) => void;
  children?: React.ReactNode;
}): JSX.Element {
  const isMerged = activity.jobs.some((job) => job.status === 'merged');
  const { jobs, payload } = activity;
  const [isFullscreenOpen, setIsFullscreenOpenState] = useState(false);
  const popoverCloseRef = useRef<HTMLButtonElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isExecutionDetailsExpanded, setIsExecutionDetailsExpanded] = useState(false);

  const formattedPayload = payload ? JSON.stringify(payload, null, 2) : '{}';

  const setIsFullscreenOpen = (isOpen: boolean) => {
    if (isOpen && popoverCloseRef.current) {
      popoverCloseRef.current.click();
    }

    setIsFullscreenOpenState(isOpen);
  };

  return (
    <>
      <motion.div
        {...fadeIn}
        className={cn('flex items-center justify-between border-neutral-100 p-2 px-3 pt-0', className)}
      >
        <div className="w-full">
          <CollapsibleSection
            title="Trigger payload"
            content={formattedPayload}
            isExpanded={isExecutionDetailsExpanded}
            onToggle={() => setIsExecutionDetailsExpanded(!isExecutionDetailsExpanded)}
          />
        </div>
      </motion.div>
      <motion.div
        {...fadeIn}
        className={cn('flex items-center justify-between border-t border-neutral-100 p-2 px-3', className)}
      >
        <div className="flex w-full flex-col items-start gap-0.5 text-left font-['Inter'] font-medium">
          <div className="flex flex-col justify-center">
            <p className="leading-[20px]">
              <span className="text-label-sm text-text-sub"> Execution details</span>
            </p>
          </div>
        </div>
      </motion.div>

      <Popover modal={true} open={isPopoverOpen} onOpenChange={(open) => setIsPopoverOpen(open)}>
        <PopoverContent className="w-[400px] p-0" align="center" side="left">
          <div className="flex items-center justify-between border-b border-neutral-100 p-3">
            <h3 className="text-foreground-950 text-sm font-medium">Request payload</h3>
          </div>
        </PopoverContent>
      </Popover>
      {isMerged && (
        <motion.div {...fadeIn} className="px-3 py-3">
          <InlineToast
            ctaClassName="text-foreground-950"
            variant={'tip'}
            ctaLabel="View Execution"
            onCtaClick={(e) => {
              e.stopPropagation();
              e.preventDefault();

              if (activity._digestedNotificationId) {
                onActivitySelect(activity._digestedNotificationId);
              }
            }}
            description="Remaining execution has been merged to an active Digest of an existing workflow execution."
          />
        </motion.div>
      )}
      <motion.div {...fadeIn} className="flex flex-1 flex-col gap-6 overflow-y-auto bg-white p-3">
        {jobs.map((job, index) => (
          <ActivityJobItem key={job._id} job={job} isFirst={index === 0} isLast={index === jobs.length - 1} />
        ))}
        {children}
      </motion.div>

      <Dialog modal={false} open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="flex max-h-[90vh] w-[90%] flex-col overflow-hidden p-0 [&>button.absolute.right-4.top-4]:hidden">
          <DialogHeader className="flex-none border-b border-neutral-100 p-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground-950 text-sm font-medium">Request payload</DialogTitle>
              <DialogClose asChild>
                <CompactButton size="md" variant="ghost" icon={RiCloseFill} type="button">
                  <span className="sr-only">Close</span>
                </CompactButton>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-3">
            <CodeBlock
              code={formattedPayload}
              language="json"
              theme="light"
              className="h-full"
              actionButtons={<CopyToClipboard content={formattedPayload} theme="light" title="Copy code" />}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
