import { TimeUnitEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { AmountInput } from '@/components/amount-input';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { LOOKBACK_AMOUNT_KEY, LOOKBACK_UNIT_KEY } from '@/components/workflow-editor/steps/digest-delay-tabs/keys';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TIME_UNIT_OPTIONS } from '@/components/workflow-editor/steps/time-units';

type LookbackType = 'immediately' | '5min' | '30min' | 'custom';

const LOOKBACK_OPTIONS = [
  { label: 'Immediately', value: 'immediately' },
  { label: 'When events repeat within 5 minutes', value: '5min' },
  { label: 'When events repeat within 30 minutes', value: '30min' },
  { label: 'Custom', value: 'custom' },
];

function deriveLookbackType(lookBackWindow?: { amount?: number; unit?: string }): LookbackType {
  if (!lookBackWindow?.amount || !lookBackWindow?.unit) {
    return 'immediately';
  }

  if (lookBackWindow.amount === 5 && lookBackWindow.unit === TimeUnitEnum.MINUTES) {
    return '5min';
  }

  if (lookBackWindow.amount === 30 && lookBackWindow.unit === TimeUnitEnum.MINUTES) {
    return '30min';
  }

  return 'custom';
}

export const LookbackWindow = ({ isReadOnly }: { isReadOnly: boolean }) => {
  const { control, setValue, getValues, trigger, watch } = useFormContext();
  const { saveForm } = useSaveForm();

  const lookBackWindowWatch = watch('controlValues.lookBackWindow');

  const lookbackType = useMemo(() => {
    return deriveLookbackType(lookBackWindowWatch);
  }, [lookBackWindowWatch]);

  const handleLookbackTypeChange = async (value: LookbackType) => {
    if (value === 'immediately') {
      setValue('controlValues.lookBackWindow', undefined, { shouldDirty: true });
    } else if (value === '5min') {
      setValue(LOOKBACK_AMOUNT_KEY, 5, { shouldDirty: true });
      setValue(LOOKBACK_UNIT_KEY, TimeUnitEnum.MINUTES, { shouldDirty: true });
    } else if (value === '30min') {
      setValue(LOOKBACK_AMOUNT_KEY, 30, { shouldDirty: true });
      setValue(LOOKBACK_UNIT_KEY, TimeUnitEnum.MINUTES, { shouldDirty: true });
    } else if (value === 'custom') {
      const currentAmount = getValues(LOOKBACK_AMOUNT_KEY);
      const currentUnit = getValues(LOOKBACK_UNIT_KEY);

      if (!currentAmount || !currentUnit || currentAmount === 5 || currentAmount === 30) {
        setValue(LOOKBACK_AMOUNT_KEY, 10, { shouldDirty: true });
        setValue(LOOKBACK_UNIT_KEY, TimeUnitEnum.MINUTES, { shouldDirty: true });
      }
    }

    await trigger(['controlValues.lookBackWindow']);
    saveForm();
  };

  return (
    <div className="flex flex-col gap-2">
      <FormLabel
        tooltip="Immediately: Start collecting events right away. Time window: Check if a notification was sent recently, if yes, start a digest; if no, deliver immediately."
        className="text-text-sub"
      >
        Start digest
      </FormLabel>
      <FormField
        control={control}
        name="lookbackType"
        render={() => (
          <FormItem>
            <FormControl>
              <Select value={lookbackType} onValueChange={handleLookbackTypeChange} disabled={isReadOnly}>
                <SelectTrigger className="w-full" size="2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOKBACK_OPTIONS.map(({ label, value }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}
      />
      {lookbackType === 'custom' && (
        <div className="flex items-center justify-between">
          <span className="text-foreground-600 text-xs font-medium">When events repeat within</span>
          <AmountInput
            fields={{ inputKey: LOOKBACK_AMOUNT_KEY, selectKey: LOOKBACK_UNIT_KEY }}
            options={TIME_UNIT_OPTIONS}
            defaultOption={TimeUnitEnum.MINUTES}
            className="w-min [&_input]:!w-[5ch] [&_input]:!min-w-[5ch]"
            onValueChange={() => saveForm()}
            showError={false}
            min={1}
            dataTestId="lookback-window-amount-input"
            isReadOnly={isReadOnly}
          />
        </div>
      )}
    </div>
  );
};
