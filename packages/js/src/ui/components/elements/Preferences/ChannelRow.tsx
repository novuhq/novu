import { JSX } from 'solid-js';
import { ChannelPreference, ChannelType, Preference } from '../../../../types';
import { useStyle } from '../../../helpers';
import {
  Chat as DefaultChat,
  Email as DefaultEmail,
  InApp as DefaultInApp,
  Push as DefaultPush,
  Sms as DefaultSms,
} from '../../../icons';
import { AppearanceCallback, AppearanceKey, IconKey } from '../../../types';
import { Switch, SwitchState } from '../../primitives/Switch';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

type ChannelRowProps = {
  channel: { channel: ChannelType; state: SwitchState };
  channelIcon?: () => JSX.Element;
  workflowId?: string;
  onChange: (channels: ChannelPreference) => void;
  preference?: Preference;
  preferenceGroup?: { name: string; preferences: Preference[] };
};

export const ChannelRow = (props: ChannelRowProps) => {
  const style = useStyle();

  const updatePreference = async (enabled: boolean) => {
    props.onChange({ [props.channel.channel]: enabled });
  };

  const onChange = async (checked: boolean) => {
    await updatePreference(checked);
  };

  const state = () => props.channel.state;
  const channel = () => props.channel.channel;

  return (
    <div
      class={style({
        key: 'channelContainer',
        className:
          'nt-flex nt-justify-between nt-items-center nt-gap-2 data-[disabled=true]:nt-text-foreground-alpha-600',
        context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
          AppearanceCallback['channelContainer']
        >[0],
      })}
    >
      <div
        class={style({
          key: 'channelLabelContainer',
          className: 'nt-flex nt-items-center nt-gap-2 nt-text-foreground',
          context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
            AppearanceCallback['channelLabelContainer']
          >[0],
        })}
      >
        <div
          class={style({
            key: 'channelIconContainer',
            className: 'nt-p-1 nt-rounded-md nt-bg-neutral-alpha-25 nt-text-foreground-alpha-300',
            context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
              AppearanceCallback['channelIconContainer']
            >[0],
          })}
        >
          <ChannelIcon
            appearanceKey="channel__icon"
            channel={channel()}
            class="nt-size-3"
            preference={props.preference}
            preferenceGroup={props.preferenceGroup}
          />
        </div>
        <span
          class={style({
            key: 'channelLabel',
            className: 'nt-text-sm nt-font-semibold',
            context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
              AppearanceCallback['channelLabel']
            >[0],
          })}
        >
          {getLabel(channel())}
        </span>
      </div>
      <div
        class={style({
          key: 'channelSwitchContainer',
          className: 'nt-flex nt-items-center',
          context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
            AppearanceCallback['channelSwitchContainer']
          >[0],
        })}
      >
        <Switch
          state={state()}
          onChange={(newState) => onChange(newState === 'enabled')}
          disabled={props.preference?.workflow?.critical}
        />
      </div>
    </div>
  );
};

type ChannelIconProps = JSX.IntrinsicElements['svg'] & {
  appearanceKey: AppearanceKey;
  channel: ChannelType;
  preference?: Preference;
  preferenceGroup?: { name: string; preferences: Preference[] };
};
const ChannelIcon = (props: ChannelIconProps) => {
  const style = useStyle();

  const iconMap: Record<ChannelType, { key: IconKey; component: JSX.Element }> = {
    [ChannelType.IN_APP]: {
      key: 'inApp',
      component: (
        <DefaultInApp
          class={style({
            key: props.appearanceKey,
            className: props.class,
            iconKey: 'inApp',
            context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
              AppearanceCallback['channel__icon']
            >[0],
          })}
        />
      ),
    },
    [ChannelType.EMAIL]: {
      key: 'email',
      component: (
        <DefaultEmail
          class={style({
            key: props.appearanceKey,
            className: props.class,
            iconKey: 'email',
            context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
              AppearanceCallback['channel__icon']
            >[0],
          })}
        />
      ),
    },
    [ChannelType.PUSH]: {
      key: 'push',
      component: (
        <DefaultPush
          class={style({
            key: props.appearanceKey,
            className: props.class,
            iconKey: 'push',
            context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
              AppearanceCallback['channel__icon']
            >[0],
          })}
        />
      ),
    },
    [ChannelType.SMS]: {
      key: 'sms',
      component: (
        <DefaultSms
          class={style({
            key: props.appearanceKey,
            className: props.class,
            iconKey: 'sms',
            context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
              AppearanceCallback['channel__icon']
            >[0],
          })}
        />
      ),
    },
    [ChannelType.CHAT]: {
      key: 'chat',
      component: (
        <DefaultChat
          class={style({
            key: props.appearanceKey,
            className: props.class,
            iconKey: 'chat',
            context: { preference: props.preference, preferenceGroup: props.preferenceGroup } satisfies Parameters<
              AppearanceCallback['channel__icon']
            >[0],
          })}
        />
      ),
    },
  };

  const iconData = iconMap[props.channel];

  if (!iconData) {
    return null;
  }

  return (
    <IconRendererWrapper
      iconKey={iconData.key}
      fallback={iconData.component}
      class={style({
        key: props.appearanceKey,
        className: props.class,
        iconKey: iconData.key,
        context: { preference: props.preference } satisfies Parameters<AppearanceCallback['channel__icon']>[0],
      })}
    />
  );
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
