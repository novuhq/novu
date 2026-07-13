import { ChannelTypeEnum, EnvironmentTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { MultiSelect } from '@/components/primitives/multi-select';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { ResourceOriginEnum } from '@/utils/enums';
import { ROUTES } from '@/utils/routes';
import { useWorkflow } from '../../workflow-provider';
import { useSaveForm } from '../save-form-context';

const FORM_CONTROL_NAME = 'controlValues.enabledIntegrations';

export const SignalsEnabledProviders = () => {
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const form = useFormContext();
  const { control } = form;
  const { saveForm } = useSaveForm();

  const isReadOnly =
    workflow?.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  const options = useMemo(() => {
    return (integrations ?? [])
      .filter(
        (integration) =>
          integration.active &&
          !integration.deleted &&
          integration.channel === ChannelTypeEnum.SIGNALS &&
          integration._environmentId === currentEnvironment?._id
      )
      .map((integration) => ({
        value: integration.identifier,
        label: integration.name || integration.identifier,
      }));
  }, [integrations, currentEnvironment?._id]);

  return (
    <FormField
      control={control}
      name={FORM_CONTROL_NAME}
      render={({ field }) => (
        <FormItem className="flex w-full flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <FormLabel tooltip="Leave empty to deliver to all active Signals integrations. Select specific integrations to limit delivery.">
              Enabled Providers
            </FormLabel>
            <Link to={ROUTES.INTEGRATIONS} className="text-foreground-600 hover:text-foreground-950 text-xs underline">
              Manage
            </Link>
          </div>
          <FormControl>
            <MultiSelect
              values={(field.value as string[] | undefined) ?? []}
              options={options}
              isDisabled={isReadOnly}
              placeholder="All active providers"
              placeholderAll="All selected"
              placeholderSelected="selected"
              onValuesChange={(values) => {
                field.onChange(values);
                saveForm();
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
