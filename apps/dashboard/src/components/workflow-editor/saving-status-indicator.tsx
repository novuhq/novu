import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { RiCheckboxCircleFill } from 'react-icons/ri';
import { LoadingIndicator } from '@/components/primitives/loading-indicator';

type SavingState = 'saving' | 'badge' | 'checkbox' | 'hidden';

export function SavingStatusIndicator({ isSaving, hasError }: { isSaving: boolean; hasError?: boolean }) {
  const [state, setState] = useState<SavingState>('hidden');
  const prevSavingRef = React.useRef(isSaving);
  const badgeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const checkboxTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const wasSaving = prevSavingRef.current;
    prevSavingRef.current = isSaving;

    if (badgeTimerRef.current) {
      clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = null;
    }
    if (checkboxTimerRef.current) {
      clearTimeout(checkboxTimerRef.current);
      checkboxTimerRef.current = null;
    }

    if (isSaving) {
      setState('saving');
    } else if (wasSaving && !isSaving) {
      // Transition from saving to not saving
      if (hasError) {
        // If there's an error, hide
        setState('hidden');
      } else {
        // Show success: badge -> checkbox -> hidden
        setState('badge');
        badgeTimerRef.current = setTimeout(() => {
          setState('checkbox');
          badgeTimerRef.current = null;
        }, 1500);

        checkboxTimerRef.current = setTimeout(() => {
          setState('hidden');
          checkboxTimerRef.current = null;
        }, 3000);
      }
    }

    return () => {
      if (badgeTimerRef.current) {
        clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = null;
      }
      if (checkboxTimerRef.current) {
        clearTimeout(checkboxTimerRef.current);
        checkboxTimerRef.current = null;
      }
    };
  }, [isSaving, hasError]);

  return (
    <div className="ml-2 flex min-w-[14px] items-center">
      <AnimatePresence mode="wait">
        {state === 'saving' && (
          <motion.div
            key="saving"
            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center"
          >
            <LoadingIndicator size="sm" />
          </motion.div>
        )}
        {state === 'badge' && (
          <motion.div
            key="badge"
            layout
            initial={{ opacity: 0, scale: 0.9, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-1.5 rounded-md bg-success-lighter px-2 py-1"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            >
              <RiCheckboxCircleFill className="size-3.5 shrink-0 text-success" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.2 }}
              className="text-label-xs text-success"
            >
              Changes saved
            </motion.span>
          </motion.div>
        )}
        {state === 'checkbox' && (
          <motion.div
            key="checkbox"
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center"
          >
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.3, ease: 'easeOut' }}>
              <RiCheckboxCircleFill className="size-3.5 text-success" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
