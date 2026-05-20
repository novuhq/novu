import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';

type ConnectPlaceholderProps = {
  section: string;
  description?: ReactNode;
};

export function ConnectPlaceholder({ section, description }: ConnectPlaceholderProps) {
  return (
    <>
      <PageMeta title={`Connect · ${section}`} />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">{section}</h1>}>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex max-w-md flex-col items-center gap-2 text-center">
            <h2 className="text-foreground-950 text-lg font-medium">Connect · {section}</h2>
            <p className="text-foreground-500 text-sm">
              {description ?? 'This page is part of the Connect dashboard. Content will be migrated soon.'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
