import type { ReactNode } from 'react';

import type { ActiveInviteStatus, InviteChannelVia } from '@/lib/invite-api';

import { EmailStep } from './email-step';
import { SlackStep } from './slack-step';
import { TelegramStep } from './telegram-step';
import { VoiceStep } from './voice-step';

export type ConnectStepProps = {
  status: ActiveInviteStatus;
  /** The channel whose steps are on screen, or undefined while the list of apps is. */
  via: InviteChannelVia | undefined;
  telegramLink: string | null;
  busy: boolean;
  connectingVia: InviteChannelVia | null;
  slackStarted: boolean;
  cooldownUntil: Partial<Record<InviteChannelVia, number>>;
  voiceCallPlaced: boolean;
  confirmingCode: boolean;
  error: ReactNode;
  onConnect: (via: InviteChannelVia, address?: string) => void;
  onConfirmVoice: (code: string) => Promise<boolean>;
  onRemoveVoice: () => void;
  onBack: () => void;
};

/**
 * The steps for the channel being connected, or null when there are none to show and the list of
 * apps belongs on screen instead.
 */
export function connectStep({
  status,
  via,
  telegramLink,
  busy,
  connectingVia,
  slackStarted,
  cooldownUntil,
  voiceCallPlaced,
  confirmingCode,
  error,
  onConnect,
  onConfirmVoice,
  onRemoveVoice,
  onBack,
}: ConnectStepProps): ReactNode {
  if (!via) {
    return null;
  }

  const channel = status.channels.find((item) => item.via === via);
  const shared = { status, busy, error, onBack };

  switch (via) {
    case 'telegram':
      // The bot link is minted on the way here; without it there is nothing to open or scan.
      return telegramLink ? (
        <TelegramStep {...shared} link={telegramLink} onRefresh={() => onConnect('telegram')} />
      ) : null;
    case 'slack':
      return (
        <SlackStep
          {...shared}
          connecting={connectingVia === 'slack'}
          started={slackStarted}
          onConnect={() => onConnect('slack')}
        />
      );
    case 'email':
      return channel ? (
        <EmailStep
          {...shared}
          channel={channel}
          connecting={connectingVia === 'email'}
          cooldownUntil={cooldownUntil.email ?? null}
          onSend={(address) => onConnect('email', address)}
        />
      ) : null;
    case 'voice':
      return channel ? (
        <VoiceStep
          {...shared}
          channel={channel}
          callPlaced={voiceCallPlaced}
          connecting={connectingVia === 'voice'}
          confirming={confirmingCode}
          cooldownUntil={cooldownUntil.voice ?? null}
          onSend={(address) => onConnect('voice', address)}
          onConfirm={onConfirmVoice}
          onRemove={onRemoveVoice}
        />
      ) : null;
    default: {
      const unreachable: never = via;

      return unreachable;
    }
  }
}
