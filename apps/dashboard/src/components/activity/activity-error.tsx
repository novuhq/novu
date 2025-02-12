import { motion } from 'motion/react';

export const ActivityError = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
      <div className="flex h-96 items-center justify-center border-t border-neutral-200">
        <div className="text-foreground-600 text-sm">Failed to load activity details</div>
      </div>
    </motion.div>
  );
};
