import { useFormContext } from 'react-hook-form';
import { RiFileCopyLine, RiInformation2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useHttpRequestTest } from './use-http-request-test';

function inferJsonSchema(value: unknown): Record<string, unknown> {
  if (value === null) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
  if (typeof value === 'string') return { type: 'string' };

  if (Array.isArray(value)) {
    const itemSchema = value.length > 0 ? inferJsonSchema(value[0]) : { type: 'string' };

    return { type: 'array', items: itemSchema };
  }

  if (typeof value === 'object') {
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      properties[k] = inferJsonSchema(v);
    }

    return { type: 'object', properties };
  }

  return { type: 'string' };
}

type EnforceSchemaValidationProps = {
  onSchemaGenerated?: (schema: Record<string, unknown>) => void;
};

export function EnforceSchemaValidation({ onSchemaGenerated }: EnforceSchemaValidationProps) {
  const { control, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const { testResult } = useHttpRequestTest();

  function handleGenerateFromLastTest() {
    if (!testResult?.body) return;

    const schema = inferJsonSchema(testResult.body);
    setValue('responseBodySchema', schema, { shouldDirty: true });
    onSchemaGenerated?.(schema);
    showSuccessToast('Response body schema generated from last test');
    saveForm();
  }

  return (
    <div className="flex items-center gap-2">
      <FormField
        control={control}
        name="enforceSchemaValidation"
        render={({ field }) => (
          <FormItem className="m-0 flex flex-1 flex-row items-center gap-2 space-y-0 self-center">
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
                    <RiInformation2Line className="text-text-soft size-3" />
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
        className="shrink-0 self-center gap-1 text-xs text-text-sub rounded-md"
        onClick={handleGenerateFromLastTest}
        disabled={!testResult?.body}
      >
        <RiFileCopyLine className="size-3" />
        Generate from last test
      </Button>
    </div>
  );
}
