import { useFormContext } from 'react-hook-form';
import { RiFileCopyLine, RiInformation2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

export function EnforceSchemaValidation() {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();

  return (
    <div className="flex items-center gap-2">
      <FormField
        control={control}
        name="enforceSchemaValidation"
        render={({ field }) => (
          <FormItem className="m-0 flex flex-1 items-center gap-2">
            <FormControl>
              <Switch
                checked={field.value ?? false}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  saveForm();
                }}
              />
            </FormControl>
            <div className="flex items-center gap-1">
              <span className="text-text-sub text-xs font-medium">Enforce schema validation</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex items-center">
                    <RiInformation2Line className="text-text-soft size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  When enabled, the response body will be validated against the defined schema
                </TooltipContent>
              </Tooltip>
            </div>
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="secondary"
        mode="outline"
        size="2xs"
        className="flex-shrink-0 gap-1 text-xs text-text-sub"
      >
        <RiFileCopyLine className="size-3" />
        Generate from last test
      </Button>
    </div>
  );
}
