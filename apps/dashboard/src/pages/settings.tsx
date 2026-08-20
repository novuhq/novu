import { SettingsTabs } from '@/components/settings/settings-tabs';
import { PageHeader } from '@/context/page-header';
import { ROUTES } from '@/utils/routes';

export function SettingsPage() {
  return (
    <>
      <PageHeader>
        <h1 className="text-foreground-950">Settings</h1>
      </PageHeader>
      <SettingsTabs
        rootRoute={ROUTES.SETTINGS}
        routes={{
          account: ROUTES.SETTINGS_ACCOUNT,
          organization: ROUTES.SETTINGS_ORGANIZATION,
          team: ROUTES.SETTINGS_TEAM,
          billing: ROUTES.SETTINGS_BILLING,
        }}
      />
    </>
  );
}
