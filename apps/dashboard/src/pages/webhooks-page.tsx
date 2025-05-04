import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { DashboardLayout } from '../components/dashboard-layout';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';

export function WebhooksPage() {
  const isWebhooksManagementEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WEBHOOKS_MANAGEMENT_ENABLED);

  if (!isWebhooksManagementEnabled) {
    // Or redirect to a 'Not Found' page or a parent page

    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Webhooks</h1>}>
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
          <div className="text-muted-foreground flex h-64 items-center justify-center">
            Endpoints Content Placeholder
          </div>
        </TabsContent>
        <TabsContent value="event-catalog" variant="regular" className="!mt-0 p-2.5">
          <div className="text-muted-foreground flex h-64 items-center justify-center">
            Event Catalog Content Placeholder
          </div>
        </TabsContent>
        <TabsContent value="logs" variant="regular" className="!mt-0 p-2.5">
          <div className="text-muted-foreground flex h-64 items-center justify-center">Logs Content Placeholder</div>
        </TabsContent>
        <TabsContent value="activity" variant="regular" className="!mt-0 p-2.5">
          <div className="text-muted-foreground flex h-64 items-center justify-center">
            Activity Content Placeholder
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
