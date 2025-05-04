import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { DashboardLayout } from '../components/dashboard-layout';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { useEffect, useState } from 'react';
import { useEnvironment } from '@/context/environment/hooks';
import { getWebhookPortalToken } from '@/api/webhooks';
import { AppPortal, SvixProvider } from 'svix-react';

export function WebhooksPage() {
  const isWebhooksManagementEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WEBHOOKS_MANAGEMENT_ENABLED);
  const { currentEnvironment } = useEnvironment();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isWebhooksManagementEnabled || !currentEnvironment) {
      setIsLoading(false);

      return;
    }

    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getWebhookPortalToken(currentEnvironment);
        setPortalUrl(response.url);
        setPortalToken(response.token);
        setAppId(response.appId);
        console.log('Webhook Portal URL:', response.url);
        console.log('Webhook Portal Token:', response.token);
      } catch (e: any) {
        console.error('Failed to fetch webhook portal token:', e);
        setError(e.message || 'Failed to load portal token.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [isWebhooksManagementEnabled, currentEnvironment]);

  if (!isWebhooksManagementEnabled) {
    // Or redirect to a 'Not Found' page or a parent page

    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

  // TODO: Add UI elements to display loading/error states and potentially the URL/token if needed

  if (!portalToken || !appId) {
    return <div>No portal token found</div>;
  }

  console.log({ portalUrl });

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
    return `${base}${separator}next=${nextPath}#${keyFragment}`;
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
            {/* Add action buttons here if needed later */}
          </div>
          <TabsContent value="endpoints" variant="regular" className="!mt-0 p-2.5">
            <AppPortal url={buildPortalUrl(portalUrl, '/endpoints')} style={{ backgroundColor: 'red' }} fullSize />
          </TabsContent>
          <TabsContent value="event-catalog" variant="regular" className="!mt-0 p-2.5">
            <AppPortal url={buildPortalUrl(portalUrl, '/event-types')} fullSize />
          </TabsContent>
          <TabsContent value="logs" variant="regular" className="!mt-0 p-2.5">
            <AppPortal url={buildPortalUrl(portalUrl, '/messages')} fullSize />
          </TabsContent>
          <TabsContent value="activity" variant="regular" className="!mt-0 p-2.5">
            <AppPortal url={buildPortalUrl(portalUrl, '/activity')} fullSize />
          </TabsContent>
        </Tabs>
      </SvixProvider>
    </DashboardLayout>
  );
}
