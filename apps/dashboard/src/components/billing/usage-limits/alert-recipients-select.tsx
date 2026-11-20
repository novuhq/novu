import { UsageAlertRecipientsEnum } from '@novu/shared';
import { type Control, useController } from 'react-hook-form';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { InfoTooltip } from './setting-card';
import type { UsageLimitsFormValues } from './usage-limits-form-values';

const RECIPIENT_LABELS: Record<UsageAlertRecipientsEnum, string> = {
  [UsageAlertRecipientsEnum.ADMINS]: 'Only admins',
  [UsageAlertRecipientsEnum.ALL_MEMBERS]: 'All members',
};

type AlertRecipientsSelectProps = {
  control: Control<UsageLimitsFormValues>;
};

export function AlertRecipientsSelect({ control }: AlertRecipientsSelectProps) {
  const { field } = useController({ control, name: 'alerts.sendTo' });

  return (
    <div className="flex items-center rounded-4 bg-bg-white p-2 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
      <div className="flex flex-1 items-center gap-px text-label-xs text-text-sub">
        Send to
        <InfoTooltip content="Only admins notifies organization owners and admins. All members notifies everyone in the organization." />
      </div>
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger
          ref={field.ref}
          size="2xs"
          className="w-1/2 rounded-6 border-stroke-soft bg-bg-white text-text-strong"
          rightIcon={<RiExpandUpDownLine className="size-3 text-text-soft" />}
          aria-label="Send to"
          onBlur={field.onBlur}
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
    </div>
  );
}
