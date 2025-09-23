import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

export const DynamicThrottle = () => {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();

  const tooltipContent = (
    <div className="space-y-2">
      <div>
        <p className="font-medium mb-1">Supported formats:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>ISO-8601 timestamp: "2025-01-01T12:00:00Z" (must be future)</li>
          <li>Duration object: {`{ "amount": 30, "unit": "minutes" }`}</li>
        </ul>
      </div>
      <div>
        <p className="font-medium mb-1">Examples:</p>
        <p>
          <code className="text-xs">payload.releaseTime</code>, <code className="text-xs">payload.throttleWindow</code>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={control}
        name="controlValues.dynamicKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel tooltip={tooltipContent}>Dynamic window key</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="payload.timestamp"
                onChange={(e) => {
                  field.onChange(e);
                  saveForm();
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};
