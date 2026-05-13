import { ChannelTypeEnum } from '@novu/shared';
import { RiRobot2Line } from 'react-icons/ri';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Step } from '@/components/primitives/step';
import { Switch } from '@/components/primitives/switch';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum } from '@/utils/enums';
import { capitalize } from '@/utils/string';

const CHANNEL_LABELS_LOOKUP: Record<`${ChannelTypeEnum}`, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-App',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
};

type PreferencesItemProps = {
  channel: ChannelTypeEnum;
  enabled: boolean;
  onChange: (checked: boolean) => void;
  readOnly?: boolean;
};

export function PreferencesItem(props: PreferencesItemProps) {
  const { channel, enabled, onChange, readOnly = false } = props;
  const stepType = channel as unknown as StepTypeEnum;
  const Icon = STEP_TYPE_TO_ICON[stepType] ?? RiRobot2Line;
  const color = STEP_TYPE_TO_COLOR[stepType] ?? 'gray';

  return (
    <div>
      <div className="flex w-full items-center justify-between space-y-1">
        <div className="flex items-center gap-2">
          <Step variant={color} className="size-5">
            <Icon />
          </Step>
          <span className="text-foreground-950 text-xs font-medium">{capitalize(CHANNEL_LABELS_LOOKUP[channel])}</span>
        </div>
        <Switch checked={enabled} onCheckedChange={readOnly ? undefined : onChange} />
      </div>
    </div>
  );
}
