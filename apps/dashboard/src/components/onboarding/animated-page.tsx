import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { cn } from '../../utils/ui';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex min-h-[100%] w-full items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}
