import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '../components/page-meta';

export function Logs() {
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
        <div className="flex h-full items-center justify-center">
          <h2 className="text-foreground-600 text-2xl font-semibold">Hello World</h2>
        </div>
      </DashboardLayout>
    </>
  );
}
