import { useFormContext } from 'react-hook-form';
import { RiInformation2Line } from 'react-icons/ri';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

export function StopOnFail() {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();

  return (
    <FormField
      control={control}
      name="controlValues.stopOnFail"
      render={({ field }) => (
        <FormItem className="m-0 flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-1">
            <span className="text-text-sub text-xs font-medium">Stop workflow on failure</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="flex items-center">
                  <RiInformation2Line className="text-text-soft size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                When enabled, the workflow will stop executing subsequent steps if this HTTP request step fails.
              </TooltipContent>
            </Tooltip>
          </div>
          <FormControl>
            <Switch
              checked={field.value ?? false}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                saveForm();
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
