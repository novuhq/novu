import { motion } from 'motion/react';
import { HttpLog } from '../../types/logs';
import { LogsDetailHeader } from './logs-detail-header';
import { LogsDetailContent } from './logs-detail-content';
import { LogsDetailSkeleton } from './logs-detail-skeleton';
import { LogsDetailError } from './logs-detail-error';
import { LogsDetailEmpty } from './logs-detail-empty';

type LogsDetailPanelProps = {
  log?: HttpLog;
  isLoading?: boolean;
  error?: boolean;
};

export function LogsDetailPanel({ log, isLoading, error }: LogsDetailPanelProps) {
  if (isLoading) {
    return <LogsDetailSkeleton />;
  }

  if (error) {
    return <LogsDetailError />;
  }

  if (!log) {
    return <LogsDetailEmpty />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="bg-background flex h-full flex-col overflow-hidden"
    >
      <LogsDetailHeader log={log} />
      <LogsDetailContent log={log} />
    </motion.div>
  );
}
