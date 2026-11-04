import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import QRCode from 'react-qr-code';

import { AppIcon } from '@/components/invite/app-icon';
import { WaitingLine } from '@/components/invite/invite-card';
import { buttonClassName } from '@/components/ui/button';
import type { ActiveInviteStatus } from '@/lib/invite-api';

import { ConnectStepCard } from './connect-step-card';

type TelegramStepProps = {
  status: ActiveInviteStatus;
  /** The freshly minted deep link into the bot. It is what makes this step showable at all. */
  link: string;
  busy: boolean;
  error: ReactNode;
  onRefresh: () => void;
  onBack: () => void;
};

/**
 * t.me hands off to the app through a `tg://` link, which fails on a computer without Telegram
 * installed, so the link is also a QR code for the phone next to a button that opens it here.
 */
export function TelegramStep({ status, link, busy, error, onRefresh, onBack }: TelegramStepProps) {
  const bot = telegramBotUsername(link);

  return (
    <ConnectStepCard
      via="telegram"
      status={status}
      title="Open the bot and press Start"
      description={`This lets ${bot ? `@${bot}` : 'the bot'} message you.`}
      error={error}
      onBack={onBack}
    >
      <div className="flex items-center gap-4">
        <TelegramQrCode url={link} bot={bot} />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <a href={link} target="_blank" rel="noopener noreferrer" className={buttonClassName('primary')}>
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            Open in Telegram
          </a>
          <p className="hidden text-xs leading-4 text-muted sm:block">Or scan with your phone</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <WaitingLine>Waiting for connection…</WaitingLine>
        <p className="text-xs leading-4 text-muted">
          The link works for 10 minutes.{' '}
          <button
            type="button"
            className="cursor-pointer rounded-sm text-secondary underline underline-offset-4 transition-colors duration-150 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            disabled={busy}
            onClick={onRefresh}
          >
            Get a new one
          </button>
        </p>
      </div>
    </ConnectStepCard>
  );
}

/** The deep link as a code to scan, on a light tile with the Telegram mark in the middle. */
function TelegramQrCode({ url, bot }: { url: string; bot?: string }) {
  return (
    <div className="relative hidden shrink-0 rounded-lg bg-foreground p-2 sm:block">
      {/* Level Q keeps the code readable with the mark covering its center. */}
      <QRCode
        value={url}
        size={80}
        level="Q"
        bgColor="#ebe2d6"
        fgColor="#0a0908"
        aria-label={`QR code that opens ${bot ? `@${bot}` : 'the bot'} in Telegram`}
      />
      <AppIcon via="telegram" className="absolute top-1/2 left-1/2 size-6 -translate-1/2 ring-2 ring-foreground" />
    </div>
  );
}

/** `https://t.me/novu_bot?start=…` → `novu_bot`. */
export function telegramBotUsername(url: string): string | undefined {
  try {
    return new URL(url).pathname.replace(/^\//, '') || undefined;
  } catch {
    return undefined;
  }
}
