import { motion } from 'motion/react';
import { AgentChannelsEmptyIllustration } from './agent-channels-empty-illustration';

export function AgentChannelsEmptyState() {
  return (
    <motion.div
      className="bg-bg-weak/30 flex min-h-[320px] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl px-6 py-16 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <AgentChannelsEmptyIllustration />
    </motion.div>
  );
}
