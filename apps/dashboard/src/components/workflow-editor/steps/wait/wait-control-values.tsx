import { TimeUnitEnum, UiSchemaGroupEnum } from '@novu/shared';
import { useMemo } from 'react';
import { AmountInput } from '@/components/amount-input';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TIME_UNIT_OPTIONS } from '@/components/workflow-editor/steps/time-units';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

const AMOUNT_KEY = 'controlValues.amount';
const UNIT_KEY = 'controlValues.unit';

export const WaitControlValues = () => {
  const { workflow, step } = useWorkflow();
  const { saveForm } = useSaveForm();
  const { uiSchema, dataSchema } = step?.controls ?? {};

  const minAmountValue = useMemo(() => {
    if (typeof dataSchema === 'object') {
      const amountField = dataSchema.properties?.amount;

      if (typeof amountField === 'object' && amountField.type === 'number') {
        return amountField.minimum ?? 1;
      }
    }

    return 1;
  }, [dataSchema]);

  if (!uiSchema || !workflow || uiSchema?.group !== UiSchemaGroupEnum.WAIT) {
    return null;
  }

  return (
    <>
      <SidebarContent size="lg">
        <div className="flex items-center justify-between">
          <span className="text-foreground-600 text-xs font-medium">Expire after</span>
          <AmountInput
            fields={{ inputKey: AMOUNT_KEY, selectKey: UNIT_KEY }}
            options={TIME_UNIT_OPTIONS}
            defaultOption={TimeUnitEnum.HOURS}
            className="w-min [&_input]:w-[5ch]! [&_input]:min-w-[5ch]!"
            onValueChange={() => saveForm()}
            showError={false}
            min={minAmountValue}
            dataTestId="wait-amount-input"
          />
        </div>
      </SidebarContent>
      <Separator />
    </>
  );
};
