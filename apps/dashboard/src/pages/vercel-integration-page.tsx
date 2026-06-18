import { useOrganization, useOrganizationList } from '@clerk/react';
import { useMemo, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { Skeleton } from '@/components/primitives/skeleton';
import { VercelIntegrationForm } from '@/components/vercel-integration-form';
import { VercelIntegrationOnboarding } from '@/components/vercel-integration-onboarding';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateVercelIntegration } from '@/hooks/use-create-vercel-integration';
import { useFetchVercelIntegration } from '@/hooks/use-fetch-vercel-integration';
import { useFetchVercelIntegrationProjects } from '@/hooks/use-fetch-vercel-integration-projects';
import { useVercelParams } from '@/hooks/use-vercel-params';

export const VercelIntegrationPage = () => {
  const { currentEnvironment } = useEnvironment();
  const { organization } = useOrganization();
  const { userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { configurationId, next, isEditMode } = useVercelParams();
  const { isPending: isCreateVercelIntegrationPending, data: createIntegrationResult } = useCreateVercelIntegration();
  const canFetchIntegration =
    !!configurationId && !!currentEnvironment && (isEditMode || !!createIntegrationResult?.success);
  const { data: vercelIntegration, isLoading: isFetchVercelIntegrationLoading } = useFetchVercelIntegration({
    configurationId,
    options: { enabled: canFetchIntegration },
  });
  const { data: vercelIntegrationProjects, isLoading: isFetchVercelIntegrationProjectsLoading } =
    useFetchVercelIntegrationProjects({
      configurationId,
      enabled: !isEditMode ? !!createIntegrationResult?.success : true,
    });
  const projects = useMemo(
    () =>
      vercelIntegrationProjects?.projects.map((project) => ({
        value: project.id,
        label: project.name,
      })) ?? [],
    [vercelIntegrationProjects]
  );
  const organizations = useMemo(
    () =>
      userMemberships.data?.map((membership) => ({
        value: membership.organization.publicMetadata.externalOrgId as string,
        label: membership.organization.name,
      })) ?? [],
    [userMemberships]
  );

  const currentOrganizationId = organization?.publicMetadata.externalOrgId as string | undefined;
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);

  if (
    isCreateVercelIntegrationPending ||
    isFetchVercelIntegrationProjectsLoading ||
    (canFetchIntegration && isFetchVercelIntegrationLoading) ||
    organizations.length === 0 ||
    !organization
  ) {
    return (
      <DashboardLayout showSideNavigation={false} showBridgeUrl={false}>
        <div className="flex w-full justify-center pt-6">
          <Card className="max-w-[700px] overflow-hidden shadow-none">
            <CardHeader>
              <h1 className="text-foreground-950 flex items-center gap-1">
                <span>Deploy your Novu agent on Vercel</span>
              </h1>
            </CardHeader>
            <CardContent className="h-fit rounded-b-xl border-t bg-neutral-50 bg-white p-4">
              <p className="text-foreground-500 mb-6 mt-1 text-xs font-normal">
                Link Vercel projects to Novu environments. Production deploys register your agent bridge once; preview
                deploys auto-wire to Development.
              </p>
              <div className="flex flex-col">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-[1fr_max-content_1fr_max-content] items-center gap-4">
                    <Skeleton className="h-9" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9 w-7" />
                  </div>
                  <Skeleton className="h-9 w-48" />
                </div>
                <Skeleton className="ml-auto h-9 w-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showSideNavigation={false} showBridgeUrl={false}>
      <div className="flex w-full justify-center p-8">
        <Card className="max-w-[700px] overflow-hidden shadow-none">
          <CardHeader>
            <h1 className="text-foreground-950 flex items-center gap-1">
              <span>Deploy your Novu agent on Vercel</span>
            </h1>
          </CardHeader>
          <CardContent className="h-fit rounded-b-xl border-t bg-neutral-50 bg-white p-4">
            <p className="text-foreground-500 mb-6 mt-1 text-xs font-normal">
              Link Vercel projects to Novu environments. Production deploys register your agent bridge once; preview
              deploys auto-wire to Development.
            </p>
            <VercelIntegrationForm
              vercelIntegrationDetails={vercelIntegration}
              organizations={organizations}
              currentOrganizationId={currentOrganizationId ?? ''}
              projects={projects}
              configurationId={configurationId}
              onProjectLinked={(projectIds) => {
                setLinkedProjectIds(projectIds);
              }}
            />
            <VercelIntegrationOnboarding
              vercelIntegrationDetails={vercelIntegration}
              vercelProjects={vercelIntegrationProjects?.projects}
              currentOrganizationId={currentOrganizationId}
              vercelReturnUrl={next}
              hasJustLinkedProject={linkedProjectIds.length > 0}
              linkedProjectIdOverride={linkedProjectIds[0]}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
