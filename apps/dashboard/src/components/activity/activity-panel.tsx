import { motion } from 'motion/react';

export interface ActivityPanelProps {
  children: React.ReactNode;
}

export function ActivityPanel({ children }: ActivityPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex h-full flex-col"
      data-testid="activity-panel"
    >
      {children}
    </motion.div>
  );
}
