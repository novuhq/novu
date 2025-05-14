import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Button } from '@/components/primitives/button';
import { DashboardLayout } from '../components/dashboard-layout';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { getWebhookPortalToken, createWebhookPortalToken } from '@/api/webhooks';
import { AppPortal, SvixProvider } from 'svix-react';
import { RiWebhookLine } from 'react-icons/ri';

interface WebhookPortalTokenResponse {
  url: string;
  token: string;
  appId: string;
}

interface CustomError extends Error {
  isPortalNotFound?: boolean;
}

export function WebhooksPage() {
  const isWebhooksManagementEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WEBHOOKS_MANAGEMENT_ENABLED);
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const {
    data: portalData,
    isLoading: isLoadingToken,
    error: tokenErrorRaw,
  }: UseQueryResult<WebhookPortalTokenResponse, CustomError> = useQuery({
    queryKey: ['webhookPortalToken', currentEnvironment?._id],
    queryFn: async () => {
      try {
        return await getWebhookPortalToken(currentEnvironment!);
      } catch (e: any) {
        if (e.message && e.message.includes('Portal not found for environment')) {
          const notFoundError = new Error('Portal not found for environment') as CustomError;
          notFoundError.isPortalNotFound = true;

          throw notFoundError;
        }

        throw e;
      }
    },
    enabled: !!isWebhooksManagementEnabled && !!currentEnvironment,
    retry: false,
  });

  const {
    mutate: enableWebhooksMutation,
    isPending: isEnablingWebhooks,
    error: enableErrorRaw,
  }: UseMutationResult<void, CustomError, void> = useMutation<void, CustomError, void>({
    mutationFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Current environment is not available for enabling webhooks.') as CustomError;
      }

      await createWebhookPortalToken(currentEnvironment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookPortalToken', currentEnvironment?._id] });
    },
  });

  const portalUrl = portalData?.url;
  const portalToken = portalData?.token;
  const appId = portalData?.appId;

  const isActualPortalNotFound = !!(tokenErrorRaw && tokenErrorRaw.isPortalNotFound);
  const queryError = tokenErrorRaw && !tokenErrorRaw.isPortalNotFound ? tokenErrorRaw : null;
  const mutationError = enableErrorRaw;

  const handleEnableWebhooks = () => {
    enableWebhooksMutation();
  };

  if (!isWebhooksManagementEnabled) {
    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

  if (isLoadingToken && !portalData && !tokenErrorRaw && !mutationError) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
        <div className="flex h-full items-center justify-center p-4">Loading webhooks configuration...</div>
      </DashboardLayout>
    );
  }

  if (isActualPortalNotFound && !isEnablingWebhooks) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
          <div className="bg-muted mb-3 flex h-16 w-16 items-center justify-center rounded-full">
            <RiWebhookLine className="text-muted-foreground h-8 w-8" />
          </div>
          <h2 className="text-foreground-900 text-xl font-semibold">Enable Webhooks for This Environment</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Once enabled, you'll be able to configure webhook endpoints, monitor events, and view delivery logs for this
            environment.
          </p>
          <Button onClick={handleEnableWebhooks} isLoading={isEnablingWebhooks} className="mt-2">
            {'Enable Webhooks'}
          </Button>
          {mutationError && (
            <p className="mt-2 text-sm text-red-500">
              Error enabling webhooks: {mutationError.message || 'An unknown error occurred.'}
            </p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const buildPortalUrl = (baseUrl: string | null, nextPath: string): string => {
    if (!baseUrl) return '';
    const urlParts = baseUrl.split('#');

    if (urlParts.length !== 2) {
      console.error('Unexpected Svix portal URL format:', baseUrl);
      return baseUrl;
    }

    const base = urlParts[0];
    const keyFragment = urlParts[1];
    const separator = base.includes('?') ? '&' : '?';

    return `${base}${separator}next=${encodeURIComponent(nextPath)}#${keyFragment}`;
  };

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
      {!(portalToken && appId) ? (
        <div className="flex h-full items-center justify-center p-4">Preparing webhook portal...</div>
      ) : (
        <SvixProvider token={portalToken} appId={appId}>
          <Tabs defaultValue="endpoints">
            <div className="border-neutral-alpha-200 flex items-center justify-between border-b">
              <TabsList variant="regular" className="border-b-0 border-t-2 border-transparent p-0 !px-2">
                <TabsTrigger value="endpoints" variant="regular">
                  Endpoints
                </TabsTrigger>
                <TabsTrigger value="event-catalog" variant="regular">
                  Event Catalog
                </TabsTrigger>
                <TabsTrigger value="logs" variant="regular">
                  Logs
                </TabsTrigger>
                <TabsTrigger value="activity" variant="regular">
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="endpoints" variant="regular" className="!mt-0 overflow-hidden p-2.5">
              <div className="mt-[-61px]">
                <AppPortal url={buildPortalUrl(portalUrl || null, '/endpoints')} fullSize />
              </div>
            </TabsContent>
            <TabsContent value="event-catalog" variant="regular" className="!mt-0 overflow-hidden p-2.5">
              <div className="mt-[-61px]">
                <AppPortal url={buildPortalUrl(portalUrl || null, '/event-types')} fullSize />
              </div>
            </TabsContent>
            <TabsContent value="logs" variant="regular" className="!mt-0 overflow-hidden p-2.5">
              <div className="mt-[-61px]">
                <AppPortal url={buildPortalUrl(portalUrl || null, '/messages')} fullSize />
              </div>
            </TabsContent>
            <TabsContent value="activity" variant="regular" className="!mt-0 overflow-hidden p-2.5">
              <div className="mt-[-61px]">
                <AppPortal url={buildPortalUrl(portalUrl || null, '/activity')} fullSize />
              </div>
            </TabsContent>
          </Tabs>
        </SvixProvider>
      )}
    </DashboardLayout>
  );
}
