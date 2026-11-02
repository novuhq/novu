import { APP_LABELS, AppIcon } from '@/components/invite/app-icon';
import { Badge } from '@/components/ui/badge';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import type { InviteChannel } from '@/lib/invite-api';

type ChannelRowProps = {
  channel: InviteChannel;
  description: string;
  connecting: boolean;
  settingDefault: boolean;
  disabled: boolean;
  onConnect: () => void;
  onMakeDefault: () => void;
  onRemove?: () => void;
};

export function ChannelRow({
  channel,
  description,
  connecting,
  settingDefault,
  disabled,
  onConnect,
  onMakeDefault,
  onRemove,
}: ChannelRowProps) {
  const label = APP_LABELS[channel.via];

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3.5">
      <AppIcon via={channel.via} />
      <div className="min-w-0 flex-1 basis-28">
        <p className="text-[13px] leading-4.5 font-medium">{label}</p>
        <p className="text-xs leading-4 text-muted">{description}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {channel.connected && <Badge variant="success">Connected</Badge>}

        {channel.connected && channel.isDefault && <Badge variant="accent">Default</Badge>}

        {channel.connected && !channel.isDefault && (
          <Button
            variant="secondary"
            className={SMALL_BUTTON}
            // No pending ellipsis here: a wider button would push the row onto two lines.
            aria-busy={settingDefault || undefined}
            disabled={disabled}
            onClick={onMakeDefault}
            aria-label={`Make ${label} your default`}
          >
            Make default
          </Button>
        )}

        {channel.connected && onRemove && (
          <Button
            variant="quiet"
            className={SMALL_BUTTON}
            disabled={disabled}
            onClick={onRemove}
            aria-label={`Remove ${label}`}
          >
            Remove
          </Button>
        )}

        {!channel.connected && (
          <Button
            variant="secondary"
            className={SMALL_BUTTON}
            aria-busy={connecting || undefined}
            disabled={disabled}
            onClick={onConnect}
            aria-label={`Connect ${label}`}
          >
            Connect
          </Button>
        )}
      </div>
    </li>
  );
}

export function channelDescription(channel: InviteChannel, telegramBot?: string): string {
  switch (channel.via) {
    case 'telegram':
      return telegramBot ? `Chat with @${telegramBot}` : 'Chat in Telegram';
    case 'slack':
      return 'Message it in Slack';
    case 'email':
      if (channel.status === 'pending') {
        return channel.address ? `Check your inbox at ${channel.address}` : 'Check your inbox for a confirmation link';
      }

      if (channel.connected && channel.address) {
        return channel.address;
      }

      return 'Email it';
    case 'voice':
      return 'A phone call';
    default: {
      const unreachable: never = channel.via;

      return unreachable;
    }
  }
}
