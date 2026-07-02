import { DashboardLayout } from '@/components/dashboard-layout';
import { SettingsTabs } from '@/components/settings/settings-tabs';
import { ROUTES } from '@/utils/routes';

export function SettingsPage() {
  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Settings</h1>}>
      <SettingsTabs
        rootRoute={ROUTES.SETTINGS}
        routes={{
          account: ROUTES.SETTINGS_ACCOUNT,
          organization: ROUTES.SETTINGS_ORGANIZATION,
          team: ROUTES.SETTINGS_TEAM,
          billing: ROUTES.SETTINGS_BILLING,
        }}
      />
    </DashboardLayout>
  );
}
