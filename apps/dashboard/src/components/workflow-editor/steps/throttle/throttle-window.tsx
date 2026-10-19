import { TimeUnitEnum } from '@novu/shared';
import { Tabs } from '@radix-ui/react-tabs';
import React, { useState } from 'react';
import { FieldValues, useFormContext } from 'react-hook-form';

import { FormLabel } from '@/components/primitives/form/form';
import { TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { DynamicThrottle } from './dynamic-throttle';
import { FixedThrottle } from './fixed-throttle';

const FIXED_THROTTLE_TYPE = 'fixed';
const DYNAMIC_THROTTLE_TYPE = 'dynamic';

type PreservedFormValuesByType = {
  fixed: FieldValues | undefined;
  dynamic: FieldValues | undefined;
};

export const ThrottleWindow = () => {
  const { setValue, getValues, trigger } = useFormContext();
  const formValues = getValues();
  const { type } = formValues.controlValues || {};
  const { saveForm } = useSaveForm();

  // Default to fixed type for backward compatibility and new steps
  const initialType = type || FIXED_THROTTLE_TYPE;
  const [throttleType, setThrottleType] = useState(initialType);

  // Set the type field if it's missing (for backward compatibility)
  React.useEffect(() => {
    if (!type) {
      setValue('controlValues.type', FIXED_THROTTLE_TYPE, { shouldDirty: false });
    }
  }, [type, setValue]);

  const [preservedFormValuesByType, setPreservedFormValuesByType] = useState<PreservedFormValuesByType>({
    fixed: undefined,
    dynamic: undefined,
  });

  const handleThrottleTypeChange = async (value: string) => {
    // Get the latest form values
    const controlValues = getValues().controlValues;

    // Preserve the current form values
    setPreservedFormValuesByType((old) => ({ ...old, [throttleType]: { ...controlValues } }));
    setThrottleType(value);

    // Restore the preserved form values
    const preservedFormValues = preservedFormValuesByType[value as keyof PreservedFormValuesByType];

    if (preservedFormValues) {
      setValue('controlValues.type', value, { shouldDirty: true });
      setValue('controlValues.amount', preservedFormValues['amount'], { shouldDirty: true });
      setValue('controlValues.unit', preservedFormValues['unit'], { shouldDirty: true });
      setValue('controlValues.dynamicKey', preservedFormValues['dynamicKey'], { shouldDirty: true });
    } else if (value === DYNAMIC_THROTTLE_TYPE) {
      setValue('controlValues.type', DYNAMIC_THROTTLE_TYPE, { shouldDirty: true });
      setValue('controlValues.amount', undefined, { shouldDirty: true });
      setValue('controlValues.unit', undefined, { shouldDirty: true });
      setValue('controlValues.dynamicKey', 'payload.timestamp', { shouldDirty: true });
    } else {
      setValue('controlValues.type', FIXED_THROTTLE_TYPE, { shouldDirty: true });
      setValue('controlValues.amount', 1, { shouldDirty: true });
      setValue('controlValues.unit', TimeUnitEnum.MINUTES, { shouldDirty: true });
      setValue('controlValues.dynamicKey', undefined, { shouldDirty: true });
    }

    await trigger();
    saveForm();
  };

  return (
    <div className="flex flex-col gap-2">
      <FormLabel
        required
        tooltip="Sets the time window for throttling. Only the specified number of executions are allowed within this window."
      >
        Throttle window
      </FormLabel>

      <Tabs value={throttleType} onValueChange={handleThrottleTypeChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value={FIXED_THROTTLE_TYPE}>Fixed</TabsTrigger>
          <TabsTrigger value={DYNAMIC_THROTTLE_TYPE}>Dynamic</TabsTrigger>
        </TabsList>

        <TabsContent value={FIXED_THROTTLE_TYPE} className="mt-3">
          <FixedThrottle />
        </TabsContent>

        <TabsContent value={DYNAMIC_THROTTLE_TYPE} className="mt-3">
          <DynamicThrottle />
        </TabsContent>
      </Tabs>
    </div>
  );
};
