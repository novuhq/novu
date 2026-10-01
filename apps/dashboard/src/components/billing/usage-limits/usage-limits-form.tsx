import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Undo2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormRoot } from '@/components/primitives/form/form';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Separator } from '@/components/primitives/separator';
import { SheetFooter, SheetMain } from '@/components/primitives/sheet';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useResetUsageLimits } from '@/hooks/use-reset-usage-limits';
import { useUpdateUsageLimits } from '@/hooks/use-update-usage-limits';
import { AlertRecipientsSelect } from './alert-recipients-select';
import { OnDemandLimitStepper } from './on-demand-limit-stepper';
import { SettingCard } from './setting-card';
import {
  getOnDemandCost,
  getPauseAtLimitDescription,
  getUsageAlertsDescription,
  pausesOnSave,
  type UsageLimitsFormValues,
  usageLimitsFormSchema,
} from './usage-limits-form-values';
import type { UsageLimitsView } from './usage-limits-view';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

type UsageLimitsFormProps = {
  view: UsageLimitsView;
  onClose: () => void;
};

export function UsageLimitsForm({ view, onClose }: UsageLimitsFormProps) {
  const formId = useId();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const { mutateAsync: updateUsageLimits, isPending: isSaving } = useUpdateUsageLimits();
  const { mutateAsync: resetUsageLimits, isPending: isResetting } = useResetUsageLimits();
  const { usage } = view;

  const form = useForm<UsageLimitsFormValues>({
    resolver: standardSchemaResolver(usageLimitsFormSchema),
    defaultValues: view.settings,
  });

  const workflowRuns = form.watch('workflowRuns');
  const onDemandCost = getOnDemandCost(workflowRuns.onDemandLimit, usage.onDemandPricePer1k);

  const onSubmit = async (values: UsageLimitsFormValues) => {
    try {
      await updateUsageLimits(values);
      showSuccessToast('Usage limits updated');
      onClose();
    } catch (error) {
      showErrorToast(getErrorMessage(error, 'Failed to update usage limits'));
    }
  };

  const onReset = async () => {
    try {
      await resetUsageLimits();
      setIsResetConfirmOpen(false);
      showSuccessToast('Usage limits reset to defaults');
      onClose();
    } catch (error) {
      showErrorToast(getErrorMessage(error, 'Failed to reset usage limits'));
    }
  };

  return (
    <>
      <SheetMain className="p-0">
        <Form {...form}>
          <FormRoot
            id={formId}
            autoComplete="off"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col"
          >
            <div className="flex flex-col gap-5 border-b border-stroke-weak px-4 pt-5 pb-[19px]">
              <FormField
                control={form.control}
                name="workflowRuns.onDemandLimit"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Workflow runs</FormLabel>
                      {onDemandCost && (
                        <span className="text-label-xs text-text-sub">~Up to {onDemandCost} on-demand at limit</span>
                      )}
                    </div>
                    <FormControl>
                      <OnDemandLimitStepper
                        ref={field.ref}
                        name={field.name}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator variant="line-spacing" className="before:bg-stroke-weak" />

              <FormField
                control={form.control}
                name="alerts.enabled"
                render={({ field }) => (
                  <SettingCard
                    label="Usage alerts"
                    tooltip="Notifies your team before on-demand usage adds up."
                    description={field.value ? undefined : getUsageAlertsDescription(usage.included, workflowRuns)}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  >
                    {field.value && <AlertRecipientsSelect control={form.control} />}
                  </SettingCard>
                )}
              />
            </div>

            <div className="flex flex-col gap-5 px-4 py-5">
              <FormField
                control={form.control}
                name="workflowRuns.pauseAtLimit"
                render={({ field }) => (
                  <SettingCard
                    label="Pause at limit"
                    tooltip="Rejects new workflow runs once usage reaches your included runs plus the on-demand limit. Without an on-demand limit, pauses at your included runs."
                    description={getPauseAtLimitDescription(usage.included, workflowRuns)}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              {pausesOnSave(usage, workflowRuns) && (
                <InlineToast
                  variant="warning"
                  title="Limit already reached."
                  description="Saving pauses new workflow runs immediately."
                />
              )}
            </div>
          </FormRoot>
        </Form>
      </SheetMain>
      <SheetFooter className="flex-row items-center justify-between border-t border-stroke-soft bg-bg-weak px-3 pt-[9px] pb-2.5 sm:justify-between">
        <LinkButton
          variant="gray"
          size="sm"
          className="gap-1 text-label-xs"
          onClick={() => setIsResetConfirmOpen(true)}
          disabled={isResetting || isSaving}
        >
          <Undo2 className="mx-0.5 size-3" />
          Reset limits
        </LinkButton>
        <Button
          type="submit"
          form={formId}
          variant="secondary"
          mode="gradient"
          size="xs"
          className="px-2.5"
          disabled={!form.formState.isDirty || !form.formState.isValid || isResetting}
          isLoading={isSaving}
        >
          Save changes
        </Button>
      </SheetFooter>
      <ConfirmationModal
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        onConfirm={onReset}
        title="Reset usage limits?"
        description="This removes the workflow run limit, turns pause at limit off, and sends usage alerts to admins again."
        confirmButtonText="Reset limits"
        isLoading={isResetting}
      />
    </>
  );
}
