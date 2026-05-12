import { ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/primitives/breadcrumb';
import { useEnvironment } from '@/context/environment/hooks';
import { useCurrentApp } from '@/hooks/use-current-app';
import { APP_LABELS, buildAppHomeRoute } from '@/utils/apps';

type AppBreadcrumbProps = {
  pageNode?: ReactNode;
};

export function AppBreadcrumb({ pageNode }: AppBreadcrumbProps) {
  const appId = useCurrentApp();
  const { currentEnvironment } = useEnvironment();
  const homeRoute = buildAppHomeRoute(appId, currentEnvironment?.slug);
  const appLabel = APP_LABELS[appId];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {homeRoute ? (
            <BreadcrumbLink to={homeRoute} className="text-foreground-600">
              {appLabel}
            </BreadcrumbLink>
          ) : (
            <span className="text-foreground-600">{appLabel}</span>
          )}
        </BreadcrumbItem>
        {pageNode ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageNode}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
