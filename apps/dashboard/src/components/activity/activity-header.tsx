import { motion } from 'motion/react';
import { RiRouteFill } from 'react-icons/ri';

import { cn } from '@/utils/ui';
import { fadeIn } from '@/utils/animation';

export const ActivityHeader = ({ title, className }: { title?: string; className?: string }) => {
  return (
    <motion.header
      {...fadeIn}
      className={cn(
        'flex items-center gap-2 border-b border-t border-neutral-200 border-b-neutral-100 px-3 pb-2 pt-[7px]',
        className
      )}
    >
      <RiRouteFill className="h-3 w-3" />
      <span className="text-foreground-950 text-sm font-medium">{title || 'Deleted workflow'}</span>
    </motion.header>
  );
};
