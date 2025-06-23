import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '../components/page-meta';
import { LogsTable } from '../components/logs/logs-table';
import { HttpLog } from '../types/logs';

export function Logs() {
  const handleLogClick = (log: HttpLog) => {
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
        <div className="flex h-full flex-col">
          <LogsTable onLogClick={handleLogClick} />
        </div>
      </DashboardLayout>
    </>
  );
}
