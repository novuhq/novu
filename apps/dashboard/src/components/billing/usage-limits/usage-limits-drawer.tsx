import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { type GetSubscriptionDto, MAX_ON_DEMAND_LIMIT, UsageAlertRecipientsEnum } from '@novu/shared';
import { Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { IconType } from 'react-icons';
import { RiAddFill, RiCloseFill, RiExpandUpDownLine, RiInformation2Line, RiSubtractFill } from 'react-icons/ri';
import { z } from 'zod';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { LinkButton } from '@/components/primitives/button-link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormRoot } from '@/components/primitives/form/form';
import { InlineToast } from '@/components/primitives/inline-toast';
import { InlineAffix, InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Separator } from '@/components/primitives/separator';
import {
  NonModalSheet,
  SheetClose,
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
import { cn } from '@/utils/ui';
import { getIncludedWorkflowRuns } from './workflow-runs-usage-state';

const ON_DEMAND_LIMIT_STEP = 1000;
const ON_DEMAND_LIMIT_PLACEHOLDER = 'No limit';
const COLLAPSE_TRANSITION = { duration: 0.2, ease: 'easeInOut' } as const;

const RECIPIENT_LABELS: Record<UsageAlertRecipientsEnum, string> = {
  [UsageAlertRecipientsEnum.ADMINS]: 'Only admins',
  [UsageAlertRecipientsEnum.ALL_MEMBERS]: 'All members',
};

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const runsFormatter = new Intl.NumberFormat('en-US');

const usageLimitsFormSchema = z.object({
  workflowRuns: z.object({
    onDemandLimit: z.number().int().min(0).max(MAX_ON_DEMAND_LIMIT).nullable(),
    pauseAtLimit: z.boolean(),
  }),
  alerts: z.object({
    enabled: z.boolean(),
    sendTo: z.enum(UsageAlertRecipientsEnum),
  }),
});

type UsageLimitsFormValues = z.infer<typeof usageLimitsFormSchema>;

/** Pausing without an on-demand limit pauses at the included runs, which the API stores as an onDemandLimit of 0. */
function getEffectiveOnDemandLimit({
  onDemandLimit,
  pauseAtLimit,
}: UsageLimitsFormValues['workflowRuns']): number | null {
  return pauseAtLimit ? (onDemandLimit ?? 0) : onDemandLimit;
}

function getPauseAtLimitDescription(
  included: number,
  onDemandLimit: number | null,
  pauseThreshold: number | null
): string {
  if (pauseThreshold === null) {
    return 'Sending stops until the cycle resets. When off, usage continues and is billed on-demand.';
  }

  if (!onDemandLimit) {
    return `Sending stops at your ${runsFormatter.format(included)} included runs until the cycle resets.`;
  }

  return `Sending stops at ${runsFormatter.format(pauseThreshold)} runs (${runsFormatter.format(included)} included + ${runsFormatter.format(onDemandLimit)} on-demand) until the cycle resets.`;
}

type SubscriptionUsageLimits = NonNullable<GetSubscriptionDto['usageLimits']>;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger type="button" className="inline-flex size-5 items-center justify-center text-text-soft">
        <RiInformation2Line className="size-[15px]" />
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
  className?: string;
};

function StepButton({ icon: Icon, label, onClick, disabled, className }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-[30px] shrink-0 items-center justify-center border-stroke-weak bg-bg-white text-text-sub transition hover:bg-bg-weak hover:text-text-strong disabled:pointer-events-none disabled:text-text-disabled',
        className
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

type OnDemandLimitStepperProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'onBlur' | 'aria-describedby' | 'aria-invalid'
> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

function OnDemandLimitStepper({ value, onChange, ...inputProps }: OnDemandLimitStepperProps) {
  const displayValue = value === null ? '' : value.toLocaleString('en-US');

  return (
    <InputRoot size="xs" className="divide-x-0 rounded-6 p-px">
      <StepButton
        icon={RiSubtractFill}
        label="Decrease limit"
        onClick={() => onChange(Math.max((value ?? 0) - ON_DEMAND_LIMIT_STEP, 0))}
        disabled={!value}
        className="border-r"
      />
      <InputWrapper className="justify-center gap-1 px-3.5">
        {/* The hidden mirror sizes the grid cell to the text, so value and suffix center as one group. */}
        <span className="inline-grid min-w-0">
          <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre text-label-xs">
            {displayValue || ON_DEMAND_LIMIT_PLACEHOLDER}
          </span>
          <InputPure
            {...inputProps}
            inputMode="numeric"
            placeholder={ON_DEMAND_LIMIT_PLACEHOLDER}
            value={displayValue}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
              onChange(digits === '' ? null : Math.min(Number(digits), MAX_ON_DEMAND_LIMIT));
            }}
            className="col-start-1 row-start-1 h-8 w-0 min-w-full text-center text-label-xs mask-none"
          />
        </span>
        <InlineAffix className="whitespace-nowrap text-label-xs text-text-soft">runs / month</InlineAffix>
      </InputWrapper>
      <StepButton
        icon={RiAddFill}
        label="Increase limit"
        onClick={() => onChange(Math.min((value ?? 0) + ON_DEMAND_LIMIT_STEP, MAX_ON_DEMAND_LIMIT))}
        disabled={value !== null && value >= MAX_ON_DEMAND_LIMIT}
        className="border-l"
      />
    </InputRoot>
  );
}

type SettingCardProps = {
  label: string;
  tooltip: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
};

function SettingCard({ label, tooltip, description, checked, onCheckedChange, children }: SettingCardProps) {
  const switchId = useId();

  return (
    <div className="flex flex-col rounded-8 bg-bg-weak p-1">
      <div className="flex items-start justify-between gap-5 px-1.5 py-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-px">
            <Label htmlFor={switchId}>{label}</Label>
            <InfoTooltip content={tooltip} />
          </div>
          <AnimatePresence initial={false}>
            {description && (
              <motion.div
                key="description"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={COLLAPSE_TRANSITION}
                className="overflow-hidden"
              >
                <p className="pt-0.5 text-label-xs text-text-soft">{description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Switch id={switchId} className="m-0.5" checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      <AnimatePresence initial={false}>
        {children && (
          // Clipping is only needed while the height animates; left on, it would cut off the content's shadow.
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={COLLAPSE_TRANSITION}
          >
            <div className="pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
      workflowRuns: {
        // Read the stored 0 back as "No limit" so turning pause off later does not leave a limit nobody set.
        onDemandLimit: usageLimits.pauseAtLimit && events.onDemandLimit === 0 ? null : events.onDemandLimit,
        pauseAtLimit: usageLimits.pauseAtLimit,
      },
      alerts: usageLimits.alerts,
    },
  });

  const onDemandLimit = form.watch('workflowRuns.onDemandLimit');
  const pauseAtLimit = form.watch('workflowRuns.pauseAtLimit');
  const pauseThreshold = pauseAtLimit ? included + (onDemandLimit ?? 0) : null;
  const onDemandCost =
    onDemandLimit !== null && events.onDemandPricePer1k !== null
      ? usdFormatter.format((onDemandLimit / 1000) * events.onDemandPricePer1k)
      : null;
  const pausesImmediately = !events.isPaused && pauseThreshold !== null && events.current >= pauseThreshold;

  const onSubmit = async (values: UsageLimitsFormValues) => {
    try {
      await updateUsageLimits({
        ...values,
        workflowRuns: {
          ...values.workflowRuns,
          onDemandLimit: getEffectiveOnDemandLimit(values.workflowRuns),
        },
      });
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
                    description={
                      field.value
                        ? undefined
                        : 'Email and inbox alerts when included usage runs out, and at 75%, 90% and 100% of the limit.'
                    }
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  >
                    {field.value && (
                      <div className="flex items-center rounded-4 bg-bg-white p-2 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
                        <div className="flex flex-1 items-center gap-px text-label-xs text-text-sub">
                          Send to
                          <InfoTooltip content="Only admins notifies organization owners and admins. All members notifies everyone in the organization." />
                        </div>
                        <FormField
                          control={form.control}
                          name="alerts.sendTo"
                          render={({ field: sendToField }) => (
                            <Select value={sendToField.value} onValueChange={sendToField.onChange}>
                              <SelectTrigger
                                size="2xs"
                                className="w-1/2 rounded-6 border-stroke-soft bg-bg-white text-text-strong"
                                rightIcon={<RiExpandUpDownLine className="size-3 text-text-soft" />}
                                aria-label="Send to"
                              >
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
                    )}
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
                    description={getPauseAtLimitDescription(included, onDemandLimit, pauseThreshold)}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              {pausesImmediately && (
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
      className="w-[400px] border-l-0"
      hideCloseButton
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <SheetHeader className="flex-row items-start justify-between space-y-0 border-b border-stroke-soft bg-bg-weak px-3 pt-3.5 pb-[13px]">
        <div className="flex flex-col gap-0.5">
          <SheetTitle className="text-label-md font-medium text-text-strong">Usage limits</SheetTitle>
          <SheetDescription className="text-label-xs text-text-soft">
            Set monthly limits for on-demand usage. Resets based on your billing cycle.
          </SheetDescription>
        </div>
        <SheetClose asChild>
          <CompactButton size="sm" variant="ghost" icon={RiCloseFill} aria-label="Close" />
        </SheetClose>
      </SheetHeader>
      {/* The form mounts with the sheet content, so every open starts from the latest subscription. */}
      <UsageLimitsForm subscription={subscription} usageLimits={usageLimits} onClose={() => onOpenChange(false)} />
    </NonModalSheet>
  );
}
