import { AnimatePresence, motion } from 'motion/react';
import { RiArrowRightSLine, RiStackLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import type { ContentSource } from './content-source';
import type { OverrideInheritance } from './override-inheritance';

type MergesOverRowProps = {
  inheritance: OverrideInheritance;
  onSelectSource?: (source: ContentSource) => void;
};

const MERGES_OVER_TRANSITION = { duration: 0.2, ease: 'easeInOut' } as const;

function MergesOverRow({ inheritance, onSelectSource }: MergesOverRowProps) {
  // Keyed by label so a layer keeps its chip when it moves between "parent" and "owner", e.g.
  // "Grafana · All integrations" morphs into the owner chip while the integration chip fades out.
  const segments = [
    ...inheritance.mergesOver.map((layer) => ({ ...layer, isOwner: false })),
    { label: inheritance.ownerLabel, source: undefined, isOwner: true },
  ];

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      <RiStackLine className="text-text-soft size-[13px] shrink-0" />
      <span className="text-label-xs text-text-soft shrink-0">Merges over</span>
      <AnimatePresence initial={false} mode="popLayout">
        {segments.map(({ label, source, isOwner }, index) => (
          <motion.div
            key={label}
            layout="position"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={MERGES_OVER_TRANSITION}
            className={cn('flex items-center gap-1.5', isOwner ? 'min-w-0' : 'shrink-0')}
          >
            {index > 0 && <RiArrowRightSLine className="text-text-soft size-[11px] shrink-0" />}
            <button
              type="button"
              className={cn(
                'text-label-2xs min-w-0 truncate rounded border px-1.5 py-0.5 transition-colors disabled:pointer-events-none',
                isOwner
                  ? 'border-stroke-soft bg-bg-white text-text-strong'
                  : 'bg-bg-muted text-text-sub hover:bg-bg-soft hover:text-text-strong border-transparent'
              )}
              disabled={isOwner || !onSelectSource}
              aria-current={isOwner ? 'page' : undefined}
              onClick={() => source && onSelectSource?.(source)}
            >
              {label}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="h-px min-w-0 flex-1" />
      <AnimatePresence initial={false} mode="popLayout">
        {inheritance.ownerIdentifier && (
          <motion.span
            key={inheritance.ownerIdentifier}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MERGES_OVER_TRANSITION}
            className="text-code-2xs text-text-soft min-w-0 shrink truncate"
          >
            {inheritance.ownerIdentifier}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

type MergesOverBarProps = {
  inheritance?: OverrideInheritance;
  onSelectSource?: (source: ContentSource) => void;
};

/**
 * Collapses the "Merges over" chain so switching between default content and an override
 * doesn't hard-cut the row in or out. Same height/opacity transition as the preview source bar.
 */
export function MergesOverBar({ inheritance, onSelectSource }: MergesOverBarProps) {
  return (
    <AnimatePresence initial={false}>
      {inheritance ? (
        <motion.div
          key="merges-over"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={MERGES_OVER_TRANSITION}
          className="shrink-0 overflow-hidden"
        >
          <div className="pb-2.5">
            <MergesOverRow inheritance={inheritance} onSelectSource={onSelectSource} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
