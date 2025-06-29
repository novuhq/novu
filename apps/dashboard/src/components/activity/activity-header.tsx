import { motion } from 'motion/react';
import { RiRouteFill } from 'react-icons/ri';

import { cn } from '@/utils/ui';
import { fadeIn } from '@/utils/animation';

export const ActivityHeader = ({ title, className }: { title?: string; className?: string }) => {
  return (
    <motion.header
      {...fadeIn}
      className={cn('bg-bg-weak border-stroke-soft flex items-center gap-1.5 border-b px-2 py-1.5', className)}
    >
      <RiRouteFill className="h-3 w-3" />
      <span className="text-foreground-950 text-sm font-medium">{title || 'Deleted workflow'}</span>
    </motion.header>
  );
};
