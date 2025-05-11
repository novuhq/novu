import { motion } from 'motion/react';
import { RiMailSettingsLine } from 'react-icons/ri';

export function SubscriptionsEmptyState() {
  return (
    <motion.div
      key="empty-state"
      className="flex h-full w-full flex-col border-t border-t-neutral-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 5 }}
          transition={{
            duration: 0.25,
            delay: 0.1,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.2,
              delay: 0.2,
            }}
            className="relative"
          >
            <RiMailSettingsLine className="size-12 text-neutral-300" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: 0.25,
            }}
            className="flex flex-col items-center gap-1 text-center"
          >
            <h2 className="text-foreground-900 text-lg font-medium">This subscriber has no topic subscriptions</h2>
            <p className="text-foreground-600 max-w-md text-sm font-normal">
              Subscribers can be added to topics via the API or from the topic screen.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
