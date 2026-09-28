import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { type GetSubscriptionDto, MAX_USAGE_LIMIT_HEADROOM, UsageAlertRecipientsEnum } from '@novu/shared';
import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { IconType } from 'react-icons';
import { RiAddFill, RiArrowGoBackLine, RiInformationLine, RiSubtractFill } from 'react-icons/ri';
import { z } from 'zod';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormRoot } from '@/components/primitives/form/form';
import { InlineToast } from '@/components/primitives/inline-toast';
import { InlineAffix, InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Separator } from '@/components/primitives/separator';
import {
  NonModalSheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useResetUsageLimits } from '@/hooks/use-reset-usage-limits';
import { useUpdateUsageLimits } from '@/hooks/use-update-usage-limits';
import { getIncludedWorkflowRuns } from './workflow-runs-usage-state';

const HEADROOM_STEP = 1000;

const RECIPIENT_LABELS: Record<UsageAlertRecipientsEnum, string> = {
  [UsageAlertRecipientsEnum.ADMINS]: 'Only admins',
  [UsageAlertRecipientsEnum.ALL_MEMBERS]: 'All members',
};

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const usageLimitsFormSchema = z
  .object({
    workflowRuns: z.object({
      headroom: z.number().int().min(0).max(MAX_USAGE_LIMIT_HEADROOM).nullable(),
      pauseAtLimit: z.boolean(),
    }),
    alerts: z.object({
      enabled: z.boolean(),
      sendTo: z.enum(UsageAlertRecipientsEnum),
    }),
  })
  .refine((values) => !values.workflowRuns.pauseAtLimit || values.workflowRuns.headroom !== null, {
    message: 'Set a workflow run limit to pause at it.',
    path: ['workflowRuns', 'pauseAtLimit'],
  });

type UsageLimitsFormValues = z.infer<typeof usageLimitsFormSchema>;

type SubscriptionUsageLimits = NonNullable<GetSubscriptionDto['usageLimits']>;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger type="button" className="inline-flex text-text-soft">
        <RiInformationLine className="size-4" />
      </TooltipTrigger>
      <TooltipContent className="max-w-56">{content}</TooltipContent>
    </Tooltip>
  );
}

type StepButtonProps = {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function StepButton({ icon: Icon, label, onClick, disabled }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex w-[34px] shrink-0 items-center justify-center text-text-sub transition hover:bg-bg-weak hover:text-text-strong disabled:pointer-events-none disabled:text-text-disabled"
    >
      <Icon className="size-4" />
    </button>
  );
}

type HeadroomStepperProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'onBlur' | 'aria-describedby' | 'aria-invalid'
> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

function HeadroomStepper({ value, onChange, ...inputProps }: HeadroomStepperProps) {
  return (
    <InputRoot size="xs" className="rounded-6">
      <StepButton
        icon={RiSubtractFill}
        label="Decrease limit"
        onClick={() => onChange(Math.max((value ?? 0) - HEADROOM_STEP, 0))}
        disabled={!value}
      />
      <InputWrapper>
        <InputPure
          {...inputProps}
          inputMode="numeric"
          placeholder="No limit"
          value={value === null ? '' : value.toLocaleString('en-US')}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '');
            onChange(digits === '' ? null : Math.min(Number(digits), MAX_USAGE_LIMIT_HEADROOM));
          }}
          className="h-[34px] min-w-0 flex-1 text-right text-paragraph-sm mask-none"
        />
        <InlineAffix className="flex-1 whitespace-nowrap text-paragraph-sm text-text-soft">runs / month</InlineAffix>
      </InputWrapper>
      <StepButton
        icon={RiAddFill}
        label="Increase limit"
        onClick={() => onChange(Math.min((value ?? 0) + HEADROOM_STEP, MAX_USAGE_LIMIT_HEADROOM))}
        disabled={value !== null && value >= MAX_USAGE_LIMIT_HEADROOM}
      />
    </InputRoot>
  );
}

type SettingCardProps = {
  label: string;
  tooltip: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
};

function SettingCard({ label, tooltip, checked, onCheckedChange, disabled, children }: SettingCardProps) {
  const switchId = useId();

  return (
    <div className="flex flex-col gap-1 rounded-8 bg-bg-weak p-1">
      <div className="flex items-center justify-between gap-2 px-2 pt-1.5">
        <div className="flex items-center gap-1">
          <Label htmlFor={switchId} disabled={disabled}>
            {label}
          </Label>
          <InfoTooltip content={tooltip} />
        </div>
        <Switch id={switchId} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
      {children}
    </div>
  );
}

function SettingDescription({ children }: { children: ReactNode }) {
  return <p className="px-2 pb-1.5 text-paragraph-xs text-text-soft">{children}</p>;
}

type UsageLimitsFormProps = {
  subscription: GetSubscriptionDto;
  usageLimits: SubscriptionUsageLimits;
  onClose: () => void;
};

function UsageLimitsForm({ subscription, usageLimits, onClose }: UsageLimitsFormProps) {
  const formId = useId();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const { mutateAsync: updateUsageLimits, isPending: isSaving } = useUpdateUsageLimits();
  const { mutateAsync: resetUsageLimits, isPending: isResetting } = useResetUsageLimits();
  const { events } = subscription;
  const included = getIncludedWorkflowRuns(subscription);

  const form = useForm<UsageLimitsFormValues>({
    resolver: standardSchemaResolver(usageLimitsFormSchema),
    defaultValues: {
      workflowRuns: { headroom: events.headroom, pauseAtLimit: usageLimits.pauseAtLimit },
      alerts: usageLimits.alerts,
    },
  });

  const headroom = form.watch('workflowRuns.headroom');
  const pauseAtLimit = form.watch('workflowRuns.pauseAtLimit');
  const onDemandCost =
    headroom !== null && events.onDemandPricePer1k !== null
      ? usdFormatter.format((headroom / 1000) * events.onDemandPricePer1k)
      : null;
  const pausesImmediately = pauseAtLimit && headroom !== null && events.current >= included + headroom;

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
      <SheetMain className="p-4">
        <Form {...form}>
          <FormRoot
            id={formId}
            autoComplete="off"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="workflowRuns.headroom"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel className="gap-1">
                      Workflow runs
                      <span className="text-paragraph-xs text-text-soft">({included.toLocaleString()} included)</span>
                    </FormLabel>
                    {onDemandCost && (
                      <span className="text-paragraph-xs text-text-sub">~Up to {onDemandCost} on-demand at limit</span>
                    )}
                  </div>
                  <FormControl>
                    <HeadroomStepper
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(value) => {
                        field.onChange(value);

                        if (value === null) {
                          form.setValue('workflowRuns.pauseAtLimit', false, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="alerts.enabled"
              render={({ field }) => (
                <SettingCard
                  label="Usage alerts"
                  tooltip="Notifies your team before on-demand usage adds up."
                  checked={field.value}
                  onCheckedChange={field.onChange}
                >
                  {field.value ? (
                    <div className="flex items-center justify-between gap-2 rounded-6 border border-stroke-soft bg-bg-white px-2 py-1.5">
                      <div className="flex items-center gap-1 text-label-xs text-text-sub">
                        Send to
                        <InfoTooltip content="Only admins notifies organization owners and admins. All members notifies everyone in the organization." />
                      </div>
                      <FormField
                        control={form.control}
                        name="alerts.sendTo"
                        render={({ field: sendToField }) => (
                          <Select value={sendToField.value} onValueChange={sendToField.onChange}>
                            <SelectTrigger size="2xs" className="w-[172px]" aria-label="Send to">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(UsageAlertRecipientsEnum).map((recipients) => (
                                <SelectItem key={recipients} value={recipients}>
                                  {RECIPIENT_LABELS[recipients]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  ) : (
                    <SettingDescription>
                      Email and inbox alerts when included usage runs out, and at 75%, 90% and 100% of the limit.
                    </SettingDescription>
                  )}
                </SettingCard>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="workflowRuns.pauseAtLimit"
              render={({ field }) => (
                <SettingCard
                  label="Pause at limit"
                  tooltip="Rejects new workflow runs once usage reaches your included runs plus the on-demand limit. Requires a limit."
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={headroom === null}
                >
                  <SettingDescription>
                    Sending stops until the cycle resets. When off, usage continues and is billed on-demand.
                  </SettingDescription>
                </SettingCard>
              )}
            />

            {pausesImmediately && (
              <InlineToast
                variant="warning"
                title="Limit already reached."
                description="Saving pauses new workflow runs immediately."
              />
            )}
          </FormRoot>
        </Form>
      </SheetMain>
      <Separator />
      <SheetFooter className="flex-row items-center justify-between px-3 sm:justify-between">
        <LinkButton
          variant="gray"
          leadingIcon={RiArrowGoBackLine}
          onClick={() => setIsResetConfirmOpen(true)}
          disabled={isResetting || isSaving}
        >
          Reset limits
        </LinkButton>
        <Button
          type="submit"
          form={formId}
          variant="secondary"
          mode="gradient"
          size="xs"
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

type UsageLimitsDrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subscription: GetSubscriptionDto;
  usageLimits: SubscriptionUsageLimits;
};

export function UsageLimitsDrawer({ isOpen, onOpenChange, subscription, usageLimits }: UsageLimitsDrawerProps) {
  return (
    <NonModalSheet
      open={isOpen}
      onOpenChange={onOpenChange}
      className="w-[400px]"
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <SheetHeader className="space-y-0.5 bg-bg-weak p-3 pr-10">
        <SheetTitle className="text-label-md font-medium text-text-strong">Usage limits</SheetTitle>
        <SheetDescription className="text-label-xs text-text-soft">
          Set monthly limits for on-demand usage. Resets based on your billing cycle.
        </SheetDescription>
      </SheetHeader>
      <Separator />
      {/* The form mounts with the sheet content, so every open starts from the latest subscription. */}
      <UsageLimitsForm subscription={subscription} usageLimits={usageLimits} onClose={() => onOpenChange(false)} />
    </NonModalSheet>
  );
}
