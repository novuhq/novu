import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { Code2 } from '@/components/icons/code-2';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { parseStepVariablesToLiquidVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { ControlInput } from '../../../primitives/control-input';
import { InputRoot, InputWrapper } from '../../../primitives/input';

export const DigestKey = () => {
  const { control } = useFormContext();
  const { step } = useWorkflow();
  const variables = useMemo(() => (step ? parseStepVariablesToLiquidVariables(step.variables) : []), [step]);

  return (
    <FormField
      control={control}
      name="controlValues.digestKey"
      render={({ field }) => (
        <FormItem className="flex w-full flex-col">
          <>
            <FormLabel
              optional
              tooltip="Digest is aggregated by the subscriberId by default. You can add one more aggregation key to group events further."
            >
              Aggregated by
            </FormLabel>
            <InputRoot>
              <InputWrapper className="flex h-[28px] items-center gap-1 border-r border-neutral-100 pr-1">
                <FormLabel className="flex h-full items-center gap-1 border-r border-neutral-100 pr-1">
                  <Code2 className="text-feature -ml-1.5 size-4" />
                  <span className="text-foreground-600 text-xs font-normal">subscriberId</span>
                </FormLabel>
                <ControlInput
                  multiline={false}
                  indentWithTab={false}
                  placeholder="Add additional digest..."
                  id={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  variables={variables}
                  size="sm"
                />
              </InputWrapper>
            </InputRoot>
            <FormMessage />
          </>
        </FormItem>
      )}
    />
  );
};
