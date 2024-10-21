import { JSX } from 'solid-js';
import { ChannelType } from '../../../../types';
import { useStyle } from '../../../helpers';
import { Chat, Email, InApp, Push, Sms } from '../../../icons';
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

  const onChange = (checked: boolean) => {
    updatePreference(checked);
  };

  return (
    <div
      class={style(
        'channelContainer',
        'nt-flex nt-justify-between nt-items-center nt-h-11 nt-gap-2 data-[disabled=true]:nt-text-foreground-alpha-600'
      )}
    >
      <div class={style('channelLabelContainer', 'nt-flex nt-items-center nt-gap-2')}>
        <div>
          <ChannelIcon channel={props.channel} />
        </div>
        <span class={style('channelLabel', 'nt-text-base nt-font-semibold')}>{getLabel(props.channel)}</span>
      </div>
      <div class={style('channelSwitchContainer', 'nt-flex nt-items-center')}>
        <Switch checked={props.enabled} onChange={(checked) => onChange(checked)} />
      </div>
    </div>
  );
};

const ChannelIcon = (props: { channel: ChannelType } & JSX.HTMLAttributes<SVGSVGElement>) => {
  switch (props.channel) {
    case ChannelType.IN_APP:
      return <InApp />;
    case ChannelType.EMAIL:
      return <Email />;
    case ChannelType.PUSH:
      return <Push />;
    case ChannelType.SMS:
      return <Sms />;
    case ChannelType.CHAT:
      return <Chat />;
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
