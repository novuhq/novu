import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

const thresholdKey = 'threshold';

export const ThrottleThreshold = () => {
  const { step } = useWorkflow();
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();
  const { dataSchema } = step?.controls ?? {};

  const minThresholdValue = useMemo(() => {
    if (typeof dataSchema === 'object') {
      const thresholdField = dataSchema.properties?.threshold;

      if (typeof thresholdField === 'object' && thresholdField.type === 'number') {
        return thresholdField.minimum ?? 1;
      }
    }

    return 1;
  }, [dataSchema]);

  return (
    <FormField
      name={`controlValues.${thresholdKey}`}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel tooltip="Maximum number of workflow executions allowed within the throttle window. Defaults to 1.">
            Execution threshold
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              min={minThresholdValue}
              size="2xs"
              placeholder="1"
              onChange={(e) => {
                field.onChange(e.target.value ? Number(e.target.value) : undefined);
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
