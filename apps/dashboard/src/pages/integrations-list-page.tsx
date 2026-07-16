import { PermissionsEnum } from '@novu/shared';
import { useCallback, useRef, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { Outlet, useNavigate } from 'react-router-dom';
import { Input } from '@/components/primitives/input';
import { PermissionButton } from '@/components/primitives/permission-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { buildRoute, ROUTES } from '@/utils/routes';
import { DashboardLayout } from '../components/dashboard-layout';
import { IntegrationsList } from '../components/integrations/components/integrations-list';
import { TableIntegration } from '../components/integrations/types';

export function IntegrationsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const onItemClick = (item: TableIntegration) => {
    navigate(buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: item.integrationId }));
  };

  const onConnectProviderClick = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

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
          <TabsList variant="regular" className="border-b-0 border-transparent p-0 px-2!">
            <TabsTrigger value="providers" variant="regular" size="xl">
              Providers
            </TabsTrigger>
          </TabsList>
          <PermissionButton
            permission={PermissionsEnum.INTEGRATION_WRITE}
            size="xs"
            variant="primary"
            mode="gradient"
            onClick={onConnectProviderClick}
            className="mr-2.5"
          >
            Connect Provider
          </PermissionButton>
        </div>
        <TabsContent value="providers" className="mt-0! p-2.5">
          <div className="mb-4 max-w-sm">
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers across channels..."
              leadingIcon={RiSearchLine}
              size="xs"
            />
          </div>
          <IntegrationsList onItemClick={onItemClick} searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
      <Outlet />
    </DashboardLayout>
  );
}
