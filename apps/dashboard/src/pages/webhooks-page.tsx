import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  IEnvironment,
} from '@novu/shared';
import { UseMutationResult, UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiLoaderLine, RiWebhookLine } from 'react-icons/ri';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppPortal, SvixProvider } from 'svix-react';
import { createWebhookPortalToken, getWebhookPortalToken } from '@/api/webhooks';
import { Button } from '@/components/primitives/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { WebhooksPaywallState } from '@/components/webhooks/webhooks-paywall-state';
import { IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { buildRoute, ROUTES } from '@/utils/routes';
import { DashboardLayout } from '../components/dashboard-layout';
import { Badge } from '../components/primitives/badge';
import { QueryKeys } from '../utils/query-keys';

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
  const { subscription, isLoading: isSubscriptionLoading } = useFetchSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const { environmentSlug } = useParams<{ environmentSlug: string }>();

  const isTierEligibleForWebhooks = getFeatureForTierAsBoolean(
    FeatureNameEnum.WEBHOOKS,
    subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
  );

  const isLoadingEligibility = isSubscriptionLoading;

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
    enabled: !!isWebhooksManagementEnabled && !!currentEnvironment && !!currentEnvironment?.webhookAppId,
    retry: false,
  });

  const {
    mutate: enableWebhooksMutation,
    isPending: isEnablingWebhooks,
    error: enableErrorRaw,
  }: UseMutationResult<void, CustomError, IEnvironment> = useMutation<void, CustomError, IEnvironment>({
    mutationFn: async (environment: IEnvironment) => {
      if (!environment) {
        throw new Error('Environment is not available for enabling webhooks.') as CustomError;
      }

      if (!isTierEligibleForWebhooks && !IS_SELF_HOSTED) {
        throw new Error('Current tier is not eligible for webhooks.') as CustomError;
      }

      await createWebhookPortalToken(environment);
    },
    onSuccess: (_, environment) => {
      queryClient.invalidateQueries({ queryKey: ['webhookPortalToken', environment._id] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.myEnvironments] });
    },
  });

  const portalUrl = portalData?.url;
  const portalToken = portalData?.token;
  const appId = portalData?.appId;

  const tabDefinitions = [
    { value: 'endpoints', label: 'Endpoints', portalPath: '/endpoints', routePath: ROUTES.WEBHOOKS_ENDPOINTS },
    {
      value: 'event-catalog',
      label: 'Event Catalog',
      portalPath: '/event-types',
      routePath: ROUTES.WEBHOOKS_EVENT_CATALOG,
    },
    { value: 'logs', label: 'Logs', portalPath: '/messages', routePath: ROUTES.WEBHOOKS_LOGS },
    { value: 'activity', label: 'Activity', portalPath: '/activity', routePath: ROUTES.WEBHOOKS_ACTIVITY },
  ];

  const activeTabDefinition =
    tabDefinitions.find(
      (tab) => environmentSlug && buildRoute(tab.routePath, { environmentSlug }) === location.pathname
    ) || tabDefinitions[0];

  const isActualPortalNotFound = !!(tokenErrorRaw && tokenErrorRaw.isPortalNotFound);
  const queryError = tokenErrorRaw && !tokenErrorRaw.isPortalNotFound ? tokenErrorRaw : null;
  const mutationError = enableErrorRaw;

  const handleEnableWebhooks = () => {
    enableWebhooksMutation(currentEnvironment!);
  };

  if (!isWebhooksManagementEnabled) {
    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

  if (window.location.pathname === ROUTES.WEBHOOKS) {
    return <Navigate to={activeTabDefinition.routePath} replace />;
  }

  if (!IS_SELF_HOSTED && !isTierEligibleForWebhooks && !isLoadingEligibility) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
        <WebhooksPaywallState />
      </DashboardLayout>
    );
  }

  const isInitialLoading = isLoadingToken && !portalData && !tokenErrorRaw && !mutationError && !isActualPortalNotFound;
  const canDisplayPortal = portalToken && appId && !isActualPortalNotFound && !queryError && !mutationError;

  if (currentEnvironment && !currentEnvironment?.webhookAppId) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-2 text-center">
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

    try {
      const url = new URL(baseUrl);
      url.searchParams.append('next', nextPath);

      return url.toString();
    } catch (error) {
      console.error('Invalid Svix portal URL format:', baseUrl, error);

      return baseUrl;
    }
  };

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
      <Tabs
        value={activeTabDefinition.value}
        onValueChange={(value) => {
          const tab = tabDefinitions.find((t) => t.value === value);

          if (tab && environmentSlug) {
            navigate(buildRoute(tab.routePath, { environmentSlug }));
          }
        }}
      >
        <div className="border-neutral-alpha-200 flex items-center justify-between border-b">
          <TabsList variant="regular" className="border-b-0 border-t-2 border-transparent p-0 !px-2">
            {tabDefinitions.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} variant="regular" size="xl">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {canDisplayPortal && portalToken && appId ? (
          <SvixProvider token={portalToken} appId={appId}>
            {tabDefinitions.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="!mt-0 overflow-hidden p-2.5">
                {activeTabDefinition.value === tab.value && (
                  <div className="mt-[-61px]">
                    <AppPortal url={buildPortalUrl(portalUrl || null, activeTabDefinition.portalPath)} fullSize />
                  </div>
                )}
              </TabsContent>
            ))}
          </SvixProvider>
        ) : (
          <>
            {tabDefinitions.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="!mt-0 overflow-hidden p-2.5">
                {activeTabDefinition.value === tab.value && (
                  <div className="flex h-full min-h-[calc(100vh-250px)] items-center justify-center p-4 text-center">
                    {isInitialLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <RiLoaderLine className="text-foreground-low h-6 w-6 animate-spin" />
                        <span className="text-muted-foreground">
                          {tab.value === 'endpoints' ? 'Loading webhooks configuration...' : 'Loading...'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        {queryError && tab.value === 'endpoints' ? (
                          <>
                            <h3 className="text-foreground text-lg font-semibold">Error Loading Webhooks</h3>
                            <p className="text-muted-foreground text-sm">{queryError.message}</p>
                          </>
                        ) : mutationError && tab.value === 'endpoints' ? (
                          <>
                            <h3 className="text-foreground text-lg font-semibold">Error Configuring Webhooks</h3>
                            <p className="text-muted-foreground text-sm">{mutationError.message}</p>
                          </>
                        ) : tab.value === 'endpoints' ? (
                          <>
                            <h3 className="text-foreground text-lg font-semibold">Error Loading Webhooks</h3>
                            <p className="text-muted-foreground text-sm">
                              There is a configuration issue. please try again later or contact support.
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {tab.label} will be available once webhooks are fully configured and endpoints are loaded.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
