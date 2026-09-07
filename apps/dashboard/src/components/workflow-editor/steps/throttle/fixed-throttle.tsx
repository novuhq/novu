import { TimeUnitEnum } from '@novu/shared';
import { useMemo } from 'react';

import { AmountInput } from '@/components/amount-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { THROTTLE_TIME_UNIT_OPTIONS } from '@/components/workflow-editor/steps/time-units';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

const AMOUNT_KEY = 'controlValues.amount';
const UNIT_KEY = 'controlValues.unit';

export const FixedThrottle = () => {
  const { step } = useWorkflow();
  const { saveForm } = useSaveForm();
  const { dataSchema } = step?.controls ?? {};

  const minAmountValue = useMemo(() => {
    if (typeof dataSchema === 'object') {
      const amountField = dataSchema.properties?.amount;

      if (typeof amountField === 'object' && amountField.type === 'number') {
        return amountField.minimum ?? 1;
      }
    }

    return 1;
  }, [dataSchema]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground-600 text-xs font-medium">Throttle for</span>
      <AmountInput
        fields={{ inputKey: AMOUNT_KEY, selectKey: UNIT_KEY }}
        options={THROTTLE_TIME_UNIT_OPTIONS}
        defaultOption={TimeUnitEnum.MINUTES}
        className="w-min [&_input]:w-[5ch]! [&_input]:min-w-[5ch]!"
        onValueChange={() => saveForm()}
        showError={false}
        min={minAmountValue}
        dataTestId="fixed-throttle-amount-input"
      />
    </div>
  );
};
