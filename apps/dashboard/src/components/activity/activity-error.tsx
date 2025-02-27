import { motion } from 'motion/react';

import { fadeIn } from '@/utils/animation';

export const ActivityError = () => {
  return (
    <motion.div {...fadeIn}>
      <div className="flex h-96 items-center justify-center border-t border-neutral-200">
        <div className="text-foreground-600 text-sm">Failed to load activity details</div>
      </div>
    </motion.div>
  );
};
