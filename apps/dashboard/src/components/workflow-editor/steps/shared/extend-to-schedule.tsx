import { EnvironmentTypeEnum } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Switch } from '@/components/primitives/switch';
import { useEnvironment } from '@/context/environment/hooks';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { ResourceOriginEnum } from '@/utils/enums';
import { useWorkflow } from '../../workflow-provider';
import { useSaveForm } from '../save-form-context';

const FORM_CONTROL_NAME = 'controlValues.extendToSchedule';

export const ExtendToSchedule = () => {
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const isReadOnly =
    workflow?.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;
  const form = useFormContext();
  const { control } = form;
  const { saveForm } = useSaveForm();

  return (
    <FormField
      control={control}
      name={FORM_CONTROL_NAME}
      render={({ field }) => (
        <FormItem className="flex w-full justify-between">
          <FormLabel tooltip="If your delay or digest window ends outside the subscriber’s schedule, delivery waits until their next available time.">
            Extend to subscriber’s schedule
          </FormLabel>
          <FormControl>
            <Switch
              {...field}
              checked={field.value}
              onCheckedChange={(value) => {
                field.onChange(value);
                saveForm();
              }}
              disabled={isReadOnly}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
