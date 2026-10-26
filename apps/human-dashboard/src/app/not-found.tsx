import { CircleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { Stage, StageCard } from '@/components/site/stage';
import { buttonClassName } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <Stage>
      <StageCard
        icon={<CircleAlert aria-hidden="true" className="size-9 text-accent" strokeWidth={1.5} />}
        title="Page not found"
        description="This page doesn't exist or was moved. Check the link, or head back to your dashboard."
      >
        <div>
          <Link href={DASHBOARD_HOME} className={buttonClassName('secondary')}>
            Go to dashboard
          </Link>
        </div>
      </StageCard>
    </Stage>
  );
}
