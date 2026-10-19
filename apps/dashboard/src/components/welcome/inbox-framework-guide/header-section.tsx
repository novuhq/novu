import { Loader } from 'lucide-react';
import { motion } from 'motion/react';

export function HeaderSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-start gap-4 pl-[72px]"
    >
      <div className="flex flex-col border-l border-[#eeeef0] p-8">
        <div className="flex items-center gap-2">
          <Loader className="h-3.5 w-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
          <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-sm font-medium text-transparent">
            Watching for Inbox Integration
          </span>
        </div>
        <p className="text-foreground-400 text-xs">Follow the steps below to initialize your Inbox component.</p>
      </div>
    </motion.div>
  );
}
