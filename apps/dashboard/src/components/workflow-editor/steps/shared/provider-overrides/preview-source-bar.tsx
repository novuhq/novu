import { AnimatePresence, motion } from 'motion/react';
import { type ContentSource, type ProviderOverrideOption } from './content-source';
import { ContentSourceSelector } from './content-source-selector';

type PreviewSourceBarProps = {
  visible: boolean;
  selectedSource: ContentSource;
  providers: ProviderOverrideOption[];
  showEscapeHatchBadge?: boolean;
  onSelectSource: (source: ContentSource) => void;
};

/**
 * Collapsible preview provider picker. Animates height/opacity so switching the editor between
 * default content and a provider override doesn't hard-cut the bar in/out.
 */
export function PreviewSourceBar({
  visible,
  selectedSource,
  providers,
  showEscapeHatchBadge,
  onSelectSource,
}: PreviewSourceBarProps) {
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="preview-source-bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="shrink-0 overflow-hidden"
        >
          <div className="border-stroke-soft bg-bg-weak flex h-7 items-center border-b">
            <ContentSourceSelector
              selectedSource={selectedSource}
              providers={providers}
              showEscapeHatchBadge={showEscapeHatchBadge}
              onSelectSource={onSelectSource}
            />
            <div className="h-full flex-1" />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
