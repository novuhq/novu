import { DelayTypeEnum, EnvironmentTypeEnum, ResourceOriginEnum, TimeUnitEnum } from '@novu/shared';
import { Tabs } from '@radix-ui/react-tabs';
import React, { useState } from 'react';
import { FieldValues, useFormContext } from 'react-hook-form';

import { FormLabel } from '@/components/primitives/form/form';
import { TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { ScheduledType } from '../digest-delay-tabs/scheduled-type';
import { EVERY_MINUTE_CRON } from '../digest-delay-tabs/utils';
import { DynamicDelay } from './dynamic-delay';
import { FixedDelay } from './fixed-delay';

const REGULAR_TYPE = 'regular';
const SCHEDULED_TYPE = 'timed';
const DYNAMIC_TYPE = 'dynamic';

type PreservedFormValuesByType = {
  regular: FieldValues | undefined;
  timed: FieldValues | undefined;
  dynamic: FieldValues | undefined;
};

export const DelayWindow = () => {
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const isReadOnly =
    workflow?.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;
  const { setValue, getValues, trigger, setError } = useFormContext();
  const formValues = getValues();
  const { type, cron } = formValues.controlValues || {};
  const { saveForm } = useSaveForm();

  const getInitialType = () => {
    if (type === DelayTypeEnum.DYNAMIC) return DYNAMIC_TYPE;
    if (type === DelayTypeEnum.TIMED || cron) return SCHEDULED_TYPE;

    return REGULAR_TYPE;
  };

  const [delayType, setDelayType] = useState(getInitialType());

  React.useEffect(() => {
    if (!type) {
      setValue('controlValues.type', DelayTypeEnum.REGULAR, { shouldDirty: false });
    }
  }, [type, setValue]);

  const [preservedFormValuesByType, setPreservedFormValuesByType] = useState<PreservedFormValuesByType>({
    regular: undefined,
    timed: undefined,
    dynamic: undefined,
  });

  const handleDelayTypeChange = async (value: string) => {
    const controlValues = getValues().controlValues;

    setPreservedFormValuesByType((old) => ({ ...old, [delayType]: { ...controlValues } }));
    setDelayType(value);

    const preservedFormValues = preservedFormValuesByType[value as keyof PreservedFormValuesByType];

    if (preservedFormValues) {
      setValue('controlValues.type', preservedFormValues['type'], { shouldDirty: true });
      setValue('controlValues.amount', preservedFormValues['amount'], { shouldDirty: true });
      setValue('controlValues.unit', preservedFormValues['unit'], { shouldDirty: true });
      setValue('controlValues.cron', preservedFormValues['cron'], { shouldDirty: true });
      setValue('controlValues.dynamicKey', preservedFormValues['dynamicKey'], { shouldDirty: true });
    } else if (value === DYNAMIC_TYPE) {
      setValue('controlValues.type', DelayTypeEnum.DYNAMIC, { shouldDirty: true });
      setValue('controlValues.amount', undefined, { shouldDirty: true });
      setValue('controlValues.unit', undefined, { shouldDirty: true });
      setValue('controlValues.cron', undefined, { shouldDirty: true });
      setValue('controlValues.dynamicKey', undefined, { shouldDirty: true });
    } else if (value === SCHEDULED_TYPE) {
      setValue('controlValues.type', DelayTypeEnum.TIMED, { shouldDirty: true });
      setValue('controlValues.amount', undefined, { shouldDirty: true });
      setValue('controlValues.unit', undefined, { shouldDirty: true });
      setValue('controlValues.cron', EVERY_MINUTE_CRON, { shouldDirty: true });
      setValue('controlValues.dynamicKey', undefined, { shouldDirty: true });
    } else {
      setValue('controlValues.type', DelayTypeEnum.REGULAR, { shouldDirty: true });
      setValue('controlValues.amount', 1, { shouldDirty: true });
      setValue('controlValues.unit', TimeUnitEnum.SECONDS, { shouldDirty: true });
      setValue('controlValues.cron', undefined, { shouldDirty: true });
      setValue('controlValues.dynamicKey', undefined, { shouldDirty: true });
    }

    await trigger();
    saveForm();
  };

  return (
    <div className="flex flex-col gap-2">
      <FormLabel required tooltip="Defines how long the workflow execution should be delayed before proceeding.">
        Delay type
      </FormLabel>

      <Tabs value={delayType} onValueChange={handleDelayTypeChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value={REGULAR_TYPE} disabled={isReadOnly}>
            Fixed
          </TabsTrigger>
          <TabsTrigger value={SCHEDULED_TYPE} disabled={isReadOnly}>
            Scheduled
          </TabsTrigger>
          <TabsTrigger value={DYNAMIC_TYPE} disabled={isReadOnly}>
            Dynamic
          </TabsTrigger>
        </TabsList>

        <TabsContent value={REGULAR_TYPE} className="mt-3">
          <FixedDelay isReadOnly={isReadOnly} />
        </TabsContent>

        <TabsContent value={SCHEDULED_TYPE} className="mt-3">
          <ScheduledType
            value={formValues.controlValues?.cron}
            onValueChange={(value) => {
              setValue('controlValues.cron', value, { shouldDirty: true });
              saveForm();
            }}
            onError={() => {
              setError('controlValues.cron', { message: 'Failed to parse cron' });
            }}
            isDisabled={isReadOnly}
            isDigest={false}
          />
        </TabsContent>

        <TabsContent value={DYNAMIC_TYPE} className="mt-3">
          <DynamicDelay />
        </TabsContent>
      </Tabs>
    </div>
  );
};
