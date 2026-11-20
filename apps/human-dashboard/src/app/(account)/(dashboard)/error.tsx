'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type DashboardErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/** Shown inside the shell when a dashboard page fails to load, so the navigation keeps working. */
export default function DashboardError({ error, retry }: DashboardErrorProps) {
  useEffect(() => {
    console.error('A dashboard page failed to render', error);
  }, [error]);

  return (
    <Card role="alert" className="flex flex-col items-start gap-3 p-6">
      <TriangleAlert aria-hidden="true" className="size-5 text-pending" />
      <h1 className="text-base font-medium tracking-tight text-foreground">We couldn&apos;t load this page</h1>
      <p className="text-sm tracking-tight text-secondary">
        Something went wrong on our side. Nothing was changed. Try again in a moment.
      </p>
      <Button variant="secondary" onClick={() => retry()}>
        Try again
      </Button>
    </Card>
  );
}
