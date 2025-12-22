import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { RiLoopRightLine, RiRefreshLine, RiRepeatOneLine } from 'react-icons/ri';

type UpdatedAgoProps = {
  lastUpdated: Date;
  onRefresh: () => Promise<void>;
};

export function UpdatedAgo({ lastUpdated, onRefresh }: UpdatedAgoProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update current time every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const timeAgo = useMemo(() => {
    const diffInSeconds = Math.floor((currentTime.getTime() - lastUpdated.getTime()) / 1000);

    if (diffInSeconds < 5) {
      return 'just now';
    } else if (diffInSeconds < 60) {
      // Round to nearest 5 seconds
      const roundedSeconds = Math.round(diffInSeconds / 5) * 5;
      return `${roundedSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  }, [lastUpdated, currentTime]);

  return (
    <div className="flex items-center gap-1.5">
      <div className="whitespace-nowrap text-xs font-medium leading-4">
        <span className="text-foreground-400">Updated </span>
        <span className="text-foreground-600">{timeAgo}</span>
      </div>
      <button
        onClick={async () => {
          setIsRefreshing(true);
          await onRefresh();
          setIsRefreshing(false);
        }}
        disabled={isRefreshing}
        className="flex items-center justify-center rounded-md bg-white p-1 transition-shadow hover:shadow-md disabled:opacity-50"
        title="Refresh data"
      >
        <div className="flex h-3.5 w-3.5 items-center justify-center p-0.5">
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={{
              duration: 1,
              repeat: isRefreshing ? Infinity : 0,
              ease: 'linear',
            }}
          >
            <RiLoopRightLine className="h-full w-full" />
          </motion.div>
        </div>
      </button>
    </div>
  );
}
