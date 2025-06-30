import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '../components/page-meta';
import { LogsTable } from '../components/http-logs/logs-table';
import { RequestLog } from '../types/logs';

export function Logs() {
  const handleLogClick = (log: RequestLog) => {
    console.log('Log clicked:', log);
    // TODO: Implement log detail view or modal
  };

  return (
    <>
      <PageMeta title="Logs" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            <span>Logs</span>
          </h1>
        }
      >
        <div className="flex h-full w-full flex-col p-[8px]">
          <LogsTable onLogClick={handleLogClick} />
        </div>
      </DashboardLayout>
    </>
  );
}
