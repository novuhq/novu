import { ACTION_PROVIDER_CONFIGS, type Controls } from '@novu/shared';
import { RJSFSchema } from '@rjsf/utils';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { JsonForm } from './json-form';

type IntegrationStepControlsProps = {
  providerId: string;
  dataSchema: Controls['dataSchema'];
};

export function IntegrationStepControls({ providerId, dataSchema }: IntegrationStepControlsProps) {
  const providerConfig = ACTION_PROVIDER_CONFIGS[providerId];
  const providerName = providerConfig?.displayName ?? providerId;

  if (!dataSchema || Object.keys(dataSchema.properties ?? {}).length === 0) {
    return (
      <SidebarContent size="md">
        <div className="bg-neutral-alpha-50 border-neutral-alpha-200 flex w-full flex-col gap-2 rounded-lg border p-4 text-sm">
          <p className="text-sm font-medium">No controls configured</p>
          <span className="text-neutral-alpha-600 text-xs">
            This {providerName} step has no configurable controls yet.
          </span>
        </div>
      </SidebarContent>
    );
  }

  return (
    <SidebarContent size="md">
      <div className="mb-2 text-sm font-medium">{providerName} configuration</div>
      <JsonForm schema={(dataSchema as RJSFSchema) || {}} disabled={false} />
    </SidebarContent>
  );
}
