import { useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { type SettingsTabRoutes, SettingsTabs } from '@/components/settings/settings-tabs';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

export function ConnectSettingsPage() {
  const { currentEnvironment } = useEnvironment();
  const environmentSlug = currentEnvironment?.slug ?? '';

  const { rootRoute, routes } = useMemo(() => {
    const params = { environmentSlug };

    const built: SettingsTabRoutes = {
      account: buildRoute(ROUTES.CONNECT_SETTINGS_ACCOUNT, params),
      organization: buildRoute(ROUTES.CONNECT_SETTINGS_ORGANIZATION, params),
      team: buildRoute(ROUTES.CONNECT_SETTINGS_TEAM, params),
      billing: buildRoute(ROUTES.CONNECT_SETTINGS_BILLING, params),
    };

    return {
      rootRoute: buildRoute(ROUTES.CONNECT_SETTINGS, params),
      routes: built,
    };
  }, [environmentSlug]);

  return (
    <>
      <PageMeta title="Connect · Settings" />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Settings</h1>}>
        {/*
         * Connect intentionally hides Billing for now — a dedicated Connect billing flow is
         * coming. Until then, any visit to `/connect/settings/billing` is bounced to the
         * Account tab by SettingsTabs's effect, and inline upgrade prompts are suppressed.
         */}
        <SettingsTabs rootRoute={rootRoute} routes={routes} hideBilling />
      </DashboardLayout>
    </>
  );
}
