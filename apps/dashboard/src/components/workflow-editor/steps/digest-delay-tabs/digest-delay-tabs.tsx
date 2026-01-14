import { DelayTypeEnum, DigestTypeEnum, EnvironmentTypeEnum, ResourceOriginEnum, TimeUnitEnum } from '@novu/shared';
import { Tabs } from '@radix-ui/react-tabs';
import { useState } from 'react';
import { FieldValues, useFormContext } from 'react-hook-form';

import { FormField, FormLabel, FormMessagePure } from '@/components/primitives/form/form';
import { Separator } from '@/components/primitives/separator';
import { TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { AMOUNT_KEY, CRON_KEY, TYPE_KEY, UNIT_KEY } from '@/components/workflow-editor/steps/digest-delay-tabs/keys';
import { LookbackWindow } from '@/components/workflow-editor/steps/digest-delay-tabs/lookback-window';
import { RegularType } from '@/components/workflow-editor/steps/digest-delay-tabs/regular-type';
import { ScheduledType } from '@/components/workflow-editor/steps/digest-delay-tabs/scheduled-type';
import { EVERY_MINUTE_CRON } from '@/components/workflow-editor/steps/digest-delay-tabs/utils';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useEnvironment } from '@/context/environment/hooks';
import { DEFAULT_CONTROL_DELAY_AMOUNT, DEFAULT_CONTROL_DIGEST_AMOUNT } from '@/utils/constants';
import { useWorkflow } from '../../workflow-provider';

const REGULAR_TYPE = 'regular';
const SCHEDULED_TYPE = 'scheduled';
const POPOVER_DURATION_MS = 600;

type PreservedFormValuesByType = { [key: string]: FieldValues | undefined };

export const DigestDelayTabs = ({ isDigest = true }: { isDigest?: boolean }) => {
  const { workflow } = useWorkflow();
  const { control, getFieldState, setValue, setError, getValues, trigger } = useFormContext();
  const formValues = getValues();
  const { cron } = formValues.controlValues;
  const { saveForm } = useSaveForm();
  const [type, setType] = useState(!cron ? REGULAR_TYPE : SCHEDULED_TYPE);

  const [preservedFormValuesByType, setPreservedFormValuesByType] = useState<PreservedFormValuesByType>({
    regular: undefined,
    scheduled: undefined,
  });
  const amountField = getFieldState(`${AMOUNT_KEY}`);
  const unitField = getFieldState(`${UNIT_KEY}`);
  const cronField = getFieldState(`${CRON_KEY}`);
  const regularError = amountField.error || unitField.error;
  const scheduledError = cronField.error;
  const { currentEnvironment } = useEnvironment();
  const isReadOnly =
    workflow?.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  const handleTypeChange = async (value: string) => {
    // get the latest form values
    const controlValues = getValues().controlValues;

    // preserve the current form values
    setPreservedFormValuesByType((old) => ({ ...old, [type]: { ...controlValues } }));
    setType(value);

    // restore the preserved form values
    const preservedFormValues = preservedFormValuesByType[value];

    if (preservedFormValues) {
      setValue(AMOUNT_KEY, preservedFormValues.amount, { shouldDirty: true });
      setValue(UNIT_KEY, preservedFormValues.unit, { shouldDirty: true });
      setValue(CRON_KEY, preservedFormValues.cron, { shouldDirty: true });
      setValue(TYPE_KEY, preservedFormValues.type, { shouldDirty: true });
    } else if (value === SCHEDULED_TYPE) {
      setValue(AMOUNT_KEY, undefined, { shouldDirty: true });
      setValue(UNIT_KEY, undefined, { shouldDirty: true });
      setValue(CRON_KEY, EVERY_MINUTE_CRON, { shouldDirty: true });
      setValue(TYPE_KEY, isDigest ? DigestTypeEnum.TIMED : DelayTypeEnum.TIMED, { shouldDirty: true });
    } else {
      setValue(AMOUNT_KEY, isDigest ? DEFAULT_CONTROL_DIGEST_AMOUNT : DEFAULT_CONTROL_DELAY_AMOUNT, {
        shouldDirty: true,
      });
      setValue(UNIT_KEY, TimeUnitEnum.SECONDS, { shouldDirty: true });
      setValue(CRON_KEY, undefined, { shouldDirty: true });
      setValue(TYPE_KEY, isDigest ? DigestTypeEnum.REGULAR : DelayTypeEnum.REGULAR, { shouldDirty: true });
    }

    await trigger();
    saveForm();
  };

  return (
    <div className="flex flex-col gap-2">
      <FormLabel>{isDigest ? 'Digest window' : 'Delay window'}</FormLabel>
      <Tabs
        value={type}
        className="flex h-full flex-1 flex-col"
        onBlur={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onValueChange={handleTypeChange}
      >
        <div className="bg-neutral-alpha-50 flex flex-col rounded-lg border border-solid border-neutral-100">
          <div className="rounded-t-lg p-2">
            <TabsList className="w-full">
              <Tooltip delayDuration={POPOVER_DURATION_MS}>
                <TooltipTrigger className="ml-1" asChild>
                  <span className="flex-1">
                    <TabsTrigger value={REGULAR_TYPE} className="w-full text-xs" disabled={isReadOnly}>
                      Regular
                    </TabsTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-56" side="top" sideOffset={10}>
                  {isDigest ? (
                    <span>
                      Set the amount of time to digest events for. Once the defined time has elapsed, the digested
                      events are sent.
                    </span>
                  ) : (
                    <span>Delays workflow execution for the set time, then proceeds to the next step.</span>
                  )}
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={POPOVER_DURATION_MS}>
                <TooltipTrigger className="ml-1" asChild>
                  <span className="flex-1">
                    <TabsTrigger value={SCHEDULED_TYPE} className="w-full text-xs" disabled={isReadOnly}>
                      Scheduled
                    </TabsTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-56" side="top" sideOffset={10}>
                  {isDigest ? (
                    <span>
                      Schedule the digest on a repeating basis (every 3 hours, every Friday at 6 p.m., etc.) to get full
                      control over when your digested events are processed and sent.
                    </span>
                  ) : (
                    <span>
                      Delays workflow execution until a specific scheduled time (e.g. until Friday at 6 p.m.), then
                      proceeds to the next step.
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </div>
          <Separator className="before:bg-neutral-100" />
          <div className="bg-background flex flex-col gap-2 rounded-b-lg p-2">
            <TabsContent value={REGULAR_TYPE} className="m-0">
              <RegularType isReadOnly={isReadOnly} isDigest={isDigest} />
              {isDigest && (
                <>
                  <Separator className="my-2 stroke-stroke-weak" />
                  <LookbackWindow isReadOnly={isReadOnly} />
                </>
              )}
            </TabsContent>
            <TabsContent value={SCHEDULED_TYPE} className="m-0">
              <FormField
                control={control}
                name={CRON_KEY}
                render={({ field }) => (
                  <ScheduledType
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      saveForm();
                    }}
                    onError={() => {
                      setError(CRON_KEY, { message: 'Failed to parse cron' });
                    }}
                    isDisabled={isReadOnly}
                    isDigest={isDigest}
                  />
                )}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
      {/* TODO: Use <FormMessage /> instead, see how we did it in <URLInput /> */}
      {(regularError || scheduledError) && (
        <FormMessagePure hasError={type === REGULAR_TYPE ? !!regularError?.message : !!scheduledError?.message}>
          {type === REGULAR_TYPE ? regularError?.message : scheduledError?.message}
        </FormMessagePure>
      )}
    </div>
  );
};
