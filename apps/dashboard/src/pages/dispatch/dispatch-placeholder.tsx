import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';

type DispatchPlaceholderProps = {
  section: string;
  description?: ReactNode;
};

export function DispatchPlaceholder({ section, description }: DispatchPlaceholderProps) {
  return (
    <>
      <PageMeta title={`Dispatch · ${section}`} />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">{section}</h1>}>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex max-w-md flex-col items-center gap-2 text-center">
            <h2 className="text-foreground-950 text-lg font-medium">Dispatch · {section}</h2>
            <p className="text-foreground-500 text-sm">
              {description ?? 'This page is part of the Dispatch dashboard. Content will be migrated soon.'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
