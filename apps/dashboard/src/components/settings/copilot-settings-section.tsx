import { type IOrganizationCopilotSettings, PermissionsEnum } from '@novu/shared';
import { COPILOT_RAISED_SURFACE_SHADOW } from '@/components/copilot-web-chat/copilot-surface';
import { Switch } from '@/components/primitives/switch';
import { IS_CLOUD } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useCopilotSettings, useUpdateCopilotSettings } from '@/hooks/use-copilot-settings';
import { useHasPermission } from '@/hooks/use-has-permission';
import { cn } from '@/utils/ui';

type CopilotSettingKey = keyof IOrganizationCopilotSettings;

type CopilotSettingRow = {
  key: CopilotSettingKey;
  title: string;
  description: (organizationName: string) => string;
};

const COPILOT_SETTING_ROWS: CopilotSettingRow[] = [
  {
    key: 'dashboardEnabled',
    title: 'Copilot in the dashboard',
    description: (organizationName) =>
      `Everyone in ${organizationName} can ask Copilot on any page. It acts with each person’s own role.`,
  },
  {
    key: 'slackEnabled',
    title: 'Copilot in Slack',
    description: () => 'Members can @Novu in channels where the app is installed. Replies link back to the dashboard.',
  },
  {
    key: 'editsEnabled',
    title: 'Edits from Copilot',
    description: () => 'Allow Copilot to change workflows, integrations and subscribers in Development.',
  },
];

/** The organization's Novu Copilot switches. Every member sees them; changing one needs the org settings permission. */
export function CopilotSettingsSection() {
  const { currentOrganization } = useAuth();
  const has = useHasPermission();
  const { settings, isLoading } = useCopilotSettings();
  const updateCopilotSettings = useUpdateCopilotSettings();
  const canEdit = has({ permission: PermissionsEnum.ORG_SETTINGS_WRITE });
  const organizationName = currentOrganization?.name || 'your organization';

  if (!IS_CLOUD) {
    return null;
  }

  return (
    <div>
      <h1 className="text-label-sm text-text-strong mb-2">Novu Copilot</h1>
      <div className="flex flex-col rounded-[10px] border border-stroke-white bg-bg-weak p-1">
        <div className="flex items-center gap-1.5 px-2 py-1.5 font-code text-code-xs uppercase">
          <span className="min-w-0 flex-1 truncate text-text-sub">Organization · Novu Copilot</span>
          <span className="shrink-0 text-text-soft">Cloud</span>
        </div>
        <div className={cn('flex flex-col overflow-hidden rounded-md bg-bg-white', COPILOT_RAISED_SURFACE_SHADOW)}>
          {COPILOT_SETTING_ROWS.map(({ key, title, description }) => {
            const switchId = `copilot-setting-${key}`;

            return (
              <div key={key} className="flex items-center gap-3 border-t border-stroke-soft px-4 py-3 first:border-t-0">
                <label htmlFor={switchId} className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-label-sm text-text-strong">{title}</span>
                  <span className="text-paragraph-xs text-text-soft">{description(organizationName)}</span>
                </label>
                <Switch
                  id={switchId}
                  checked={settings[key]}
                  disabled={!canEdit || isLoading}
                  onCheckedChange={(checked) => updateCopilotSettings.mutate({ [key]: checked })}
                />
              </div>
            );
          })}
        </div>
      </div>
      {!canEdit && (
        <p className="text-paragraph-xs text-text-soft mt-2 pl-1">Only admins and owners can change these.</p>
      )}
    </div>
  );
}
