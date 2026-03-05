import { HttpRequestKeyValuePair } from '@novu/shared';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiAddLine, RiDeleteBin6Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FormField } from '@/components/primitives/form/form';
import { InputRoot } from '@/components/primitives/input';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { SectionHeader } from './section-header';

type KeyValuePairListProps = {
  fieldName: 'headers' | 'body';
  label: string;
  tooltip?: string;
};

export function KeyValuePairList({ fieldName, label, tooltip }: KeyValuePairListProps) {
  const { control, getValues, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const getPairs = (): HttpRequestKeyValuePair[] => getValues(fieldName) ?? [];

  const [pairs, setPairs] = useState<HttpRequestKeyValuePair[]>(() => getPairs());

  const syncToForm = (updated: HttpRequestKeyValuePair[]) => {
    setValue(fieldName, updated);
    saveForm();
  };

  const handleAdd = () => {
    const updated = [...pairs, { key: '', value: '' }];
    setPairs(updated);
    syncToForm(updated);
  };

  const handleUpdate = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = pairs.map((pair, i) => (i === index ? { ...pair, [field]: newValue } : pair));
    setPairs(updated);
  };

  const handleBlur = () => {
    syncToForm(pairs);
  };

  const handleRemove = (index: number) => {
    const updated = pairs.filter((_, i) => i !== index);
    setPairs(updated);
    syncToForm(updated);
  };

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader label={label} tooltip={tooltip} />
      <div className="flex flex-col gap-1">
        {pairs.map((pair, index) => (
          <div key={index} className="flex items-center gap-1">
            <InputRoot className="w-[200px] flex-shrink-0">
              <ControlInput
                size="2xs"
                multiline={false}
                indentWithTab={false}
                placeholder="key..."
                value={pair.key}
                isAllowedVariable={isAllowedVariable}
                variables={variables}
                onChange={(val) => handleUpdate(index, 'key', typeof val === 'string' ? val : '')}
                onBlur={handleBlur}
              />
            </InputRoot>
            <InputRoot className="min-w-0 flex-1">
              <ControlInput
                size="2xs"
                multiline={false}
                indentWithTab={false}
                placeholder="Insert value..."
                value={pair.value}
                isAllowedVariable={isAllowedVariable}
                variables={variables}
                onChange={(val) => handleUpdate(index, 'value', typeof val === 'string' ? val : '')}
                onBlur={handleBlur}
              />
            </InputRoot>
            <Button
              type="button"
              variant="secondary"
              mode="ghost"
              size="2xs"
              className="h-7 w-7 flex-shrink-0 p-0 text-text-soft hover:text-destructive"
              onClick={() => handleRemove(index)}
            >
              <RiDeleteBin6Line className="size-3.5" />
            </Button>
          </div>
        ))}

        <FormField
          control={control}
          name={fieldName}
          render={() => (
            <Button
              type="button"
              variant="secondary"
              mode="ghost"
              size="2xs"
              className="w-fit gap-1 px-1 text-xs text-text-sub"
              onClick={handleAdd}
            >
              <RiAddLine className="size-3.5" />
              Add {fieldName === 'headers' ? 'header' : 'field'}
            </Button>
          )}
        />
      </div>
    </div>
  );
}
