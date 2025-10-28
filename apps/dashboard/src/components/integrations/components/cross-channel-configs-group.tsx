import { ConfigConfigurationGroup } from '@novu/shared';
import { Control } from 'react-hook-form';
import { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';
import { configurationToCredential } from './utils/helpers';

type CrossChannelConfigsGroupProps = {
  integrationId?: string;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  group: ConfigConfigurationGroup;
};

export function CrossChannelConfigsGroup({ integrationId, control, isReadOnly, group }: CrossChannelConfigsGroupProps) {
  const { configurations } = group;
  return (
    <>
      {configurations.map((config) => (
        <CredentialSection
          key={`${String(config.key)}-${integrationId || 'no-id'}`}
          name="configurations"
          credential={configurationToCredential(config)}
          control={control}
          isReadOnly={isReadOnly}
          integrationId={integrationId}
        />
      ))}
    </>
  );
}
