import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Button } from '@/components/primitives/button';
import { DashboardLayout } from '../components/dashboard-layout';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { useEffect, useState } from 'react';
import { useEnvironment } from '@/context/environment/hooks';
import { getWebhookPortalToken, createWebhookPortalToken } from '@/api/webhooks';
import { AppPortal, SvixProvider } from 'svix-react';
import { RiWebhookLine } from 'react-icons/ri';

export function WebhooksPage() {
  const isWebhooksManagementEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WEBHOOKS_MANAGEMENT_ENABLED);
  const { currentEnvironment } = useEnvironment();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPortalNotFound, setIsPortalNotFound] = useState<boolean>(false);
  const [isEnabling, setIsEnabling] = useState<boolean>(false);

  useEffect(() => {
    if (!isWebhooksManagementEnabled || !currentEnvironment) {
      setIsLoading(false);

      return;
    }

    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);
      setIsPortalNotFound(false);

      try {
        const response = await getWebhookPortalToken(currentEnvironment);
        setPortalUrl(response.url);
        setPortalToken(response.token);
        setAppId(response.appId);
        // console.log('Webhook Portal URL:', response.url);
        // console.log('Webhook Portal Token:', response.token);
      } catch (e: any) {
        if (e.message && e.message.includes('Portal not found for environment')) {
          setIsPortalNotFound(true);
          setError(null);
          setPortalUrl(null);
          setPortalToken(null);
          setAppId(null);
        } else {
          setIsPortalNotFound(false);
          setError(e.message || 'Failed to load portal token.');
        }

        console.error('Failed to fetch webhook portal token:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [isWebhooksManagementEnabled, currentEnvironment]);

  const handleEnableWebhooks = async () => {
    if (!currentEnvironment) return;

    setIsEnabling(true);
    setError(null); // Clear previous errors before attempting to enable

    try {
      // First, attempt to create/enable the portal.
      await createWebhookPortalToken(currentEnvironment);

      // Then, fetch the newly created (or existing) portal token to confirm and get its details.
      const response = await getWebhookPortalToken(currentEnvironment);
      setPortalUrl(response.url);
      setPortalToken(response.token);
      setAppId(response.appId);
      setIsPortalNotFound(false); // Successfully created/fetched
    } catch (e: any) {
      console.error('Failed to enable webhooks/fetch portal token:', e);

      if (e.message && e.message.includes('Portal not found for environment')) {
        setIsPortalNotFound(true); // Still not found
        setError(null);
      } else {
        setError(e.message || 'Failed to enable webhooks.');
        setIsPortalNotFound(false);
      }
    } finally {
      setIsEnabling(false);
    }
  };

  if (!isWebhooksManagementEnabled) {
    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

  if (isLoading) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
        <div className="flex h-full items-center justify-center p-4">Loading webhooks configuration...</div>
      </DashboardLayout>
    );
  }

  if (isPortalNotFound) {
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
          <Button onClick={handleEnableWebhooks} disabled={isEnabling} className="mt-2">
            {isEnabling ? 'Enabling Webhooks...' : 'Enable Webhooks'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
        <div className="flex h-full items-center justify-center p-4 text-red-500">Error: {error}</div>
      </DashboardLayout>
    );
  }

  if (!portalToken || !appId) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
        <div className="flex h-full items-center justify-center p-4">
          Webhook portal configuration is not available. Please try again or contact support if the issue persists.
        </div>
      </DashboardLayout>
    );
  }

  // Function to safely construct the portal URL with the next parameter
  const buildPortalUrl = (baseUrl: string | null, nextPath: string): string => {
    if (!baseUrl) return '';
    const urlParts = baseUrl.split('#');

    if (urlParts.length !== 2) {
      console.error('Unexpected Svix portal URL format:', baseUrl);
      return baseUrl;
    }

    const base = urlParts[0];
    const keyFragment = urlParts[1];
    // Add only the next parameter
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}next=${encodeURIComponent(nextPath)}#${keyFragment}`;
  };

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
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
              <AppPortal url={buildPortalUrl(portalUrl, '/endpoints')} fullSize />
            </div>
          </TabsContent>
          <TabsContent value="event-catalog" variant="regular" className="!mt-0 overflow-hidden p-2.5">
            <div className="mt-[-61px]">
              <AppPortal url={buildPortalUrl(portalUrl, '/event-types')} fullSize />
            </div>
          </TabsContent>
          <TabsContent value="logs" variant="regular" className="!mt-0 overflow-hidden p-2.5">
            <div className="mt-[-61px]">
              <AppPortal url={buildPortalUrl(portalUrl, '/messages')} fullSize />
            </div>
          </TabsContent>
          <TabsContent value="activity" variant="regular" className="!mt-0 overflow-hidden p-2.5">
            <div className="mt-[-61px]">
              <AppPortal url={buildPortalUrl(portalUrl, '/activity')} fullSize />
            </div>
          </TabsContent>
        </Tabs>
      </SvixProvider>
    </DashboardLayout>
  );
}
