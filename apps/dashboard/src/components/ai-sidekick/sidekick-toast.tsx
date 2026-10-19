import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { RiCheckLine, RiCloseLine, RiEyeLine, RiLoader3Line } from 'react-icons/ri';
import { Shimmer } from '../ai-elements/shimmer';
import { Button } from '../primitives/button';
import { Kbd } from '../primitives/kbd';

type SidekickToastProps = {
  isVisible: boolean;
  variant: 'generating' | 'reviewing';
  isActionPending?: boolean;
  onCancel?: () => void;
  onDiscard?: () => void;
  onKeepAll?: () => void;
};

export function SidekickToast({
  isVisible,
  variant,
  isActionPending,
  onCancel,
  onDiscard,
  onKeepAll,
}: SidekickToastProps) {
  useEffect(() => {
    if (!isVisible || variant !== 'generating' || !onCancel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, variant, onCancel]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-4 left-8 right-8 z-10"
        >
          <div className="flex justify-between items-center gap-3 rounded-lg border border-[#F2F5F8] bg-white p-2 shadow-[0px_0px_0px_1px_rgba(225,228,234,1),0px_1px_3px_0px_rgba(14,18,27,0.12)]">
            {variant === 'generating' ? (
              <>
                <div className="flex flex-1 items-center gap-1.5">
                  <RiLoader3Line className="size-5 shrink-0 animate-spin text-[#99A0AE]" />
                  <Shimmer className="text-label-xs">Drafting the best practices.</Shimmer>
                </div>
                {onCancel && (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="2xs" mode="outline" onClick={onCancel} disabled={isActionPending}>
                      Cancel
                      <Kbd className="h-4 shrink-0 border border-[#E1E4EA] bg-[#FBFBFB] p-0 px-[3px] text-text-soft">
                        esc
                      </Kbd>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 overflow-hidden">
                  <RiEyeLine className="size-3.5 shrink-0 text-[#99A0AE]" />
                  <span className="text-label-xs text-[#525866] truncate">
                    Reviewing changes. Discard will revert them.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onDiscard && (
                    <Button
                      variant="secondary"
                      size="2xs"
                      mode="outline"
                      trailingIcon={RiCloseLine}
                      onClick={onDiscard}
                      disabled={isActionPending}
                    >
                      Discard
                    </Button>
                  )}
                  {onKeepAll && (
                    <Button
                      variant="primary"
                      size="2xs"
                      mode="gradient"
                      trailingIcon={RiCheckLine}
                      onClick={onKeepAll}
                      disabled={isActionPending}
                    >
                      Keep all
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
