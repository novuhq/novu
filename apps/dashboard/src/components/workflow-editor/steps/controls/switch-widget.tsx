import { useMemo } from 'react';
import { type WidgetProps } from '@rjsf/utils';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Switch } from '@/components/primitives/switch';
import { capitalize } from '@/utils/string';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { getFieldName } from './template-utils';

export function SwitchWidget(props: WidgetProps) {
  const { label, readonly, disabled, required, id } = props;
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();
  const extractedName = useMemo(() => getFieldName(id), [id]);

  return (
    <FormField
      control={control}
      name={extractedName}
      render={({ field }) => (
        <FormItem>
          <div className="flex w-full items-center justify-between space-y-0 py-1">
            <FormLabel className="cursor-pointer">{capitalize(label)}</FormLabel>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(value) => {
                  field.onChange(value);
                  saveForm();
                }}
                disabled={readonly || disabled}
                required={required}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
