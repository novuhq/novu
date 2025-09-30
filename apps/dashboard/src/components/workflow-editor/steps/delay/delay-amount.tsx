import { EnvironmentTypeEnum, ResourceOriginEnum, TimeUnitEnum } from '@novu/shared';
import { useMemo } from 'react';
import { AmountInput } from '@/components/amount-input';
import { FormLabel } from '@/components/primitives/form/form';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TIME_UNIT_OPTIONS } from '@/components/workflow-editor/steps/time-units';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';

const amountKey = 'amount';
const unitKey = 'unit';

export const DelayAmount = () => {
  const { step, workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const { saveForm } = useSaveForm();
  const { dataSchema } = step?.controls ?? {};
  const isReadOnly =
    workflow?.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

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
    <div className="flex h-full flex-col gap-2">
      <FormLabel required tooltip="Delays workflow for the set time, then proceeds to the next step.">
        Delay execution by
      </FormLabel>
      <AmountInput
        fields={{ inputKey: `controlValues.${amountKey}`, selectKey: `controlValues.${unitKey}` }}
        options={TIME_UNIT_OPTIONS}
        defaultOption={TimeUnitEnum.SECONDS}
        isReadOnly={isReadOnly}
        onValueChange={() => saveForm()}
        min={minAmountValue}
      />
    </div>
  );
};
