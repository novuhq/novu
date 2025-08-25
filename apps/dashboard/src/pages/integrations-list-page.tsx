import { PermissionsEnum } from '@novu/shared';
import { useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PermissionButton } from '@/components/primitives/permission-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { buildRoute, ROUTES } from '@/utils/routes';
import { DashboardLayout } from '../components/dashboard-layout';
import { IntegrationsList } from '../components/integrations/components/integrations-list';
import { TableIntegration } from '../components/integrations/types';
import { Badge } from '../components/primitives/badge';

export function IntegrationsListPage() {
  const navigate = useNavigate();

  const onItemClick = (item: TableIntegration) => {
    navigate(buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: item.integrationId }));
  };

  const onAddIntegrationClickCallback = useCallback(() => {
    navigate(ROUTES.INTEGRATIONS_CONNECT);
  }, [navigate]);

  return (
    <DashboardLayout
      headerStartItems={
        <h1 className="text-foreground-950 flex items-center gap-1">
          <span>Integration Store</span>
        </h1>
      }
    >
      <Tabs defaultValue="providers" className="-mx-2">
        <div className="border-neutral-alpha-200 flex items-center justify-between border-b">
          <TabsList variant="regular" className="border-b-0 border-transparent p-0 !px-2">
            <TabsTrigger value="providers" variant="regular" size="xl">
              Providers
            </TabsTrigger>
          </TabsList>
          <PermissionButton
            permission={PermissionsEnum.INTEGRATION_WRITE}
            size="xs"
            variant="primary"
            mode="gradient"
            onClick={onAddIntegrationClickCallback}
            className="mr-2.5"
          >
            Connect Provider
          </PermissionButton>
        </div>
        <TabsContent value="providers" className="!mt-0 p-2.5">
          <IntegrationsList onItemClick={onItemClick} />
        </TabsContent>
      </Tabs>
      <Outlet />
    </DashboardLayout>
  );
}
