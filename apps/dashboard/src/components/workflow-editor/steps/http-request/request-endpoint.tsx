import { HttpMethodEnum } from '@novu/shared';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiCornerDownRightLine, RiFileCopyLine, RiPlayCircleLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { InputRoot } from '../../../primitives/input';
import { SectionHeader } from './section-header';

const HTTP_METHODS = Object.values(HttpMethodEnum);

const METHOD_COLORS: Record<HttpMethodEnum, string> = {
  [HttpMethodEnum.GET]: 'text-[#49C46C]',
  [HttpMethodEnum.POST]: 'text-[#F97316]',
  [HttpMethodEnum.PUT]: 'text-[#3B82F6]',
  [HttpMethodEnum.PATCH]: 'text-[#A855F7]',
  [HttpMethodEnum.DELETE]: 'text-[#EF4444]',
  [HttpMethodEnum.HEAD]: 'text-text-sub',
  [HttpMethodEnum.OPTIONS]: 'text-text-sub',
};

export function RequestEndpoint() {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const handleCopyUrl = useCallback((url: string) => {
    if (url) navigator.clipboard.writeText(url);
  }, []);

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader
        label="Request endpoint"
        tooltip="The URL to send the HTTP request to"
        rightSlot={
          <Button
            type="button"
            variant="secondary"
            mode="ghost"
            size="2xs"
            className="gap-1 px-1 text-xs font-medium text-text-strong"
          >
            <RiPlayCircleLine className="size-3.5" />
            Test endpoint
          </Button>
        }
      />

      <div className="flex items-center gap-1">
        <RiCornerDownRightLine className="size-4 shrink-0 text-text-sub" />
        <div className="flex-shrink-0">
          <FormField
            control={control}
            name="method"
            render={({ field }) => (
              <FormItem className="m-0 space-y-0">
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      saveForm();
                    }}
                  >
                    <SelectTrigger
                      size="2xs"
                      className="w-auto min-w-[72px] gap-1 border-stroke-soft bg-bg-white font-mono text-xs font-medium shadow-xs"
                    >
                      <SelectValue>
                        <span className={METHOD_COLORS[field.value as HttpMethodEnum] ?? 'text-text-strong'}>
                          {field.value ?? HttpMethodEnum.POST}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((method) => (
                        <SelectItem key={method} value={method} className="font-mono text-xs">
                          <span className={METHOD_COLORS[method]}>{method}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="url"
          render={({ field }) => (
            <FormItem className="m-0 min-w-0 flex-1">
              <FormControl>
                <InputRoot className="h-7 flex-1 border-stroke-soft shadow-xs">
                  <ControlInput
                    size="2xs"
                    multiline={false}
                    indentWithTab={false}
                    placeholder="https://api.example.com/endpoint"
                    value={field.value ?? ''}
                    isAllowedVariable={isAllowedVariable}
                    variables={variables}
                    onChange={(val) => field.onChange(val)}
                    onBlur={() => {
                      field.onBlur();
                      saveForm();
                    }}
                  />
                </InputRoot>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="url"
          render={({ field }) => (
            <Button
              type="button"
              variant="secondary"
              mode="ghost"
              size="2xs"
              className="h-7 w-7 flex-shrink-0 p-0"
              onClick={() => handleCopyUrl(field.value ?? '')}
            >
              <RiFileCopyLine className="size-3" />
            </Button>
          )}
        />
      </div>
    </div>
  );
}
