import { motion } from 'motion/react';
import { RequestLog } from '../../types/logs';
import { LogsDetailContent } from './logs-detail-content';
import { RequestLogDetailEmptyState } from './logs-detail-empty';
import { LogsDetailError } from './logs-detail-error';
import { LogsDetailHeader } from './logs-detail-header';
import { LogsDetailSkeleton } from './logs-detail-skeleton';
import { WorkflowRunsContent } from './workflow-runs-content';

type LogsDetailPanelProps = {
  log?: RequestLog;
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
    return <RequestLogDetailEmptyState />;
  }

  const shouldShowWorkflowRuns =
    log.path === '/v1/events/trigger' ||
    log.path === '/v1/events/trigger/bulk' ||
    log.path === '/v1/events/trigger/broadcast';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-hidden"
    >
      <LogsDetailHeader />
      <LogsDetailContent log={log} />
      {shouldShowWorkflowRuns && <WorkflowRunsContent log={log} />}
    </motion.div>
  );
}
