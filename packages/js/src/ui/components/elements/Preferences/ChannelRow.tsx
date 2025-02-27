import { JSX } from 'solid-js';
import { ChannelType } from '../../../../types';
import { useStyle } from '../../../helpers';
import { Chat, Email, InApp, Push, Sms } from '../../../icons';
import { AppearanceKey } from '../../../types';
import { Switch } from './Switch';

type ChannelRowProps = {
  channel: ChannelType;
  enabled: boolean;
  channelIcon?: () => JSX.Element;
  workflowId?: string;
  onChange: ({ channel, enabled, workflowId }: { workflowId?: string; channel: ChannelType; enabled: boolean }) => void;
};

export const ChannelRow = (props: ChannelRowProps) => {
  const style = useStyle();

  const updatePreference = async (enabled: boolean) => {
    props.onChange({ channel: props.channel, enabled, workflowId: props.workflowId });
  };

  const onChange = async (checked: boolean) => {
    await updatePreference(checked);
  };

  return (
    <div
      class={style(
        'channelContainer',
        'nt-flex nt-justify-between nt-items-center nt-gap-2 data-[disabled=true]:nt-text-foreground-alpha-600'
      )}
    >
      <div class={style('channelLabelContainer', 'nt-flex nt-items-center nt-gap-2 nt-text-foreground')}>
        <div
          class={style(
            'channelIconContainer',
            'nt-p-1 nt-rounded-md nt-bg-neutral-alpha-25 nt-text-foreground-alpha-300'
          )}
        >
          <ChannelIcon appearanceKey="channel__icon" channel={props.channel} class="nt-size-3" />
        </div>
        <span class={style('channelLabel', 'nt-text-sm nt-font-semibold')}>{getLabel(props.channel)}</span>
      </div>
      <div class={style('channelSwitchContainer', 'nt-flex nt-items-center')}>
        <Switch checked={props.enabled} onChange={(checked) => onChange(checked)} />
      </div>
    </div>
  );
};

type ChannelIconProps = JSX.IntrinsicElements['svg'] & {
  appearanceKey: AppearanceKey;
  channel: ChannelType;
};
const ChannelIcon = (props: ChannelIconProps) => {
  const style = useStyle();

  switch (props.channel) {
    case ChannelType.IN_APP:
      return <InApp class={style(props.appearanceKey, props.class)} />;
    case ChannelType.EMAIL:
      return <Email class={style(props.appearanceKey, props.class)} />;
    case ChannelType.PUSH:
      return <Push class={style(props.appearanceKey, props.class)} />;
    case ChannelType.SMS:
      return <Sms class={style(props.appearanceKey, props.class)} />;
    case ChannelType.CHAT:
      return <Chat class={style(props.appearanceKey, props.class)} />;
    default:
      return null;
  }
};

export const getLabel = (channel: ChannelType) => {
  switch (channel) {
    case ChannelType.IN_APP:
      return 'In-App';
    case ChannelType.EMAIL:
      return 'Email';
    case ChannelType.PUSH:
      return 'Push';
    case ChannelType.SMS:
      return 'SMS';
    case ChannelType.CHAT:
      return 'Chat';
    default:
      return '';
  }
};
