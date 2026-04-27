import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { Textarea } from '@/components/primitives/textarea';
import { cn } from '@/utils/ui';

type DetailsSidebarProps = {
  children: React.ReactNode;
  className?: string;
};

type DetailsSidebarRowProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

type ExpandableDetailsTextareaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPersist?: () => Promise<void> | void;
  onBeforeExpand?: () => void;
  onExpandedChange?: (isExpanded: boolean) => void;
  placeholder?: string;
  maxLength?: number;
  showCounter?: boolean;
  disabled?: boolean;
  isPersisting?: boolean;
  spellCheck?: boolean;
  textareaClassName?: string;
};

export function DetailsSidebar({ children, className }: DetailsSidebarProps) {
  return <div className={cn('flex w-[300px] shrink-0 flex-col gap-2.5', className)}>{children}</div>;
}

export function DetailsSidebarCard({ children, className }: DetailsSidebarProps) {
  return <div className={cn('bg-bg-weak flex flex-col rounded p-1 py-1.5', className)}>{children}</div>;
}

export function DetailsSidebarRow({ label, children, className }: DetailsSidebarRowProps) {
  return (
    <div className={cn('flex h-8 items-center justify-between px-1.5', className)}>
      <span className="text-text-soft text-label-xs flex items-center gap-1 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

export function ExpandableDetailsTextarea({
  label,
  value,
  onChange,
  onPersist,
  onBeforeExpand,
  onExpandedChange,
  placeholder,
  maxLength,
  showCounter,
  disabled,
  isPersisting,
  spellCheck,
  textareaClassName,
}: ExpandableDetailsTextareaProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const savingInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -4 };
  const savingAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 };
  const savingExit = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -4 };

  const setExpanded = useCallback(
    (nextIsExpanded: boolean) => {
      setIsExpanded(nextIsExpanded);
      onExpandedChange?.(nextIsExpanded);
    },
    [onExpandedChange]
  );

  const persistAndCollapse = useCallback(() => {
    void Promise.resolve(onPersist?.())
      .then(() => {
        setExpanded(false);
      })
      .catch(() => {});
  }, [onPersist, setExpanded]);

  const toggleExpanded = useCallback(() => {
    if (isExpanded) {
      if (isPersisting) {
        return;
      }

      persistAndCollapse();

      return;
    }

    onBeforeExpand?.();
    setExpanded(true);
  }, [isExpanded, isPersisting, onBeforeExpand, persistAndCollapse, setExpanded]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (containerRef.current?.contains(target)) {
        return;
      }

      if (isPersisting) {
        return;
      }

      persistAndCollapse();
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, isPersisting, persistAndCollapse]);

  return (
    <div ref={containerRef} className="flex flex-col">
      <button
        type="button"
        onClick={toggleExpanded}
        className="group text-text-soft hover:text-text-sub flex h-8 w-full cursor-pointer items-center justify-between rounded px-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-stroke-strong"
      >
        <span className="flex items-center gap-1.5 text-label-xs font-medium">
          {label}
          <AnimatePresence initial={false}>
            {isPersisting ? (
              <motion.span
                key="saving"
                initial={savingInitial}
                animate={savingAnimate}
                exit={savingExit}
                transition={{ duration: 0.15 }}
                className="text-text-soft text-label-xs font-normal italic"
              >
                Saving…
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
        <span className="text-foreground-400 group-hover:text-foreground-600 flex min-w-8 shrink-0 items-center justify-end">
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center justify-center"
          >
            <RiExpandUpDownLine
              className={cn('size-3.5 translate-x-0.5 transition-transform duration-200', isExpanded && 'rotate-180')}
            />
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="mt-2 overflow-hidden px-1.5"
          >
            <Textarea
              className={cn('min-h-24 text-sm', textareaClassName)}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={maxLength}
              showCounter={showCounter}
              disabled={disabled}
              spellCheck={spellCheck}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
