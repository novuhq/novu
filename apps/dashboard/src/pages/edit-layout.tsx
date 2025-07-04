import { AnimatedOutlet } from '@/components/animated-outlet';
import { FullPageLayout } from '@/components/full-page-layout';
import { LayoutBreadcrumbs } from '@/components/layouts/layout-breadcrumbs';

export const EditLayoutPage = () => {
  return (
    <FullPageLayout headerStartItems={<LayoutBreadcrumbs />}>
      <div className="flex h-full w-full">
        <AnimatedOutlet />
      </div>
    </FullPageLayout>
  );
};
