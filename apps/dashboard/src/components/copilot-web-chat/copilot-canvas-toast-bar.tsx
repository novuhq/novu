import { CopilotReviewActionEnum } from '@novu/shared';
import { ScanEye } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { RiCheckLine, RiCloseFill, RiLoader4Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { COPILOT_REVIEW_LABELS } from './copilot-review-labels';

type CopilotCanvasToastBarProps = {
  isVisible: boolean;
  variant: 'running' | 'reviewing';
  isCancelDisabled?: boolean;
  isActionPending?: boolean;
  onCancel: () => void;
  onDiscard?: () => void;
  onKeepAll?: () => void;
};

/** The bar centred above the bottom of the workflow canvas while the web-chat Copilot edits or waits for a review. */
export function CopilotCanvasToastBar({
  isVisible,
  variant,
  isCancelDisabled,
  isActionPending,
  onCancel,
  onDiscard,
  onKeepAll,
}: CopilotCanvasToastBarProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        // The wrapper centres with a translate, so the enter/exit motion runs on the inner bar to keep both transforms.
        <div
          key="copilot-canvas-toast"
          className="absolute bottom-6 left-1/2 z-10 w-[500px] max-w-[calc(100%-32px)] -translate-x-1/2"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex h-11 items-center gap-3 rounded-8 border border-stroke-weak bg-bg-white p-2"
          >
            {variant === 'running' ? (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    <RiLoader4Line className="size-[18px] animate-spin text-text-sub" />
                  </span>
                  <span className="truncate text-label-xs text-text-strong">Copilot is editing this workflow…</span>
                </div>
                <Button
                  variant="secondary"
                  mode="outline"
                  size="2xs"
                  className="rounded-6 pr-1.5"
                  onClick={onCancel}
                  disabled={isCancelDisabled}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    <ScanEye className="size-5 text-text-sub" strokeWidth={1.5} />
                  </span>
                  <span className="truncate text-label-xs text-text-strong">
                    Reviewing changes. Discard reverts them.
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {onDiscard && (
                    <Button
                      variant="secondary"
                      mode="outline"
                      size="2xs"
                      className="rounded-6 pr-1.5"
                      trailingIcon={RiCloseFill}
                      onClick={onDiscard}
                      disabled={isActionPending}
                    >
                      {COPILOT_REVIEW_LABELS[CopilotReviewActionEnum.REVERT]}
                    </Button>
                  )}
                  {onKeepAll && (
                    <Button
                      variant="primary"
                      mode="gradient"
                      size="2xs"
                      className="rounded-6 pr-1.5"
                      trailingIcon={RiCheckLine}
                      onClick={onKeepAll}
                      disabled={isActionPending}
                    >
                      {COPILOT_REVIEW_LABELS[CopilotReviewActionEnum.KEEP]}
                    </Button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
