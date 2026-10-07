'use client';

import { ArrowUpRight, Check, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import QRCode from 'react-qr-code';

import {
  checkTelegramConnectedAction,
  refreshTelegramStartLinkAction,
  saveTelegramTokenAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { ChannelIcon } from '@/components/channels/channel-icon';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CopyField } from '@/components/ui/copy-field';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { Field, Input } from '@/components/ui/input';
import { Step, Stepper } from '@/components/ui/stepper';
import type { TelegramSetupState } from '@/lib/human-telegram-setup';
import { cn } from '@/lib/utils';

const BOTFATHER_URL = 'https://t.me/botfather';
/** Two lines in one grid cell: the one that's out fades and slides a little while the other comes in. */
const SWAP_LAYER =
  'col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none';
const POLL_INTERVAL_MS = 2500;
/** After this long the drawer stops asking on its own, so a forgotten tab doesn't poll forever. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type SetupStep = 'create' | 'token' | 'start' | 'connected';

type TelegramSetupProps = {
  /** How far the setup got when the page loaded, so the drawer has something to show the moment it opens. */
  setup: TelegramSetupState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The drawer that walks through giving the agent a Telegram bot. The Channels table opens it. */
export function TelegramSetup({ setup, open, onOpenChange }: TelegramSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>(setup.step);
  const [bot, setBot] = useState(botOf(setup));
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string>();
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const [saving, startSaving] = useTransition();

  const found = findBotToken(pasted);
  // Kept after the token is gone from the field, so the line still has its words while it fades out.
  const [foundLabel, setFoundLabel] = useState('');
  const showsFound = Boolean(found) && !error;

  // Reopening picks the setup up where the page says it is: a saved bot goes straight to "say hi".
  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(setup.step);
    setBot(botOf(setup));
    setError(undefined);
    setPasted('');
    setWaitedTooLong(false);

    if (setup.step !== 'start') {
      return;
    }

    // The link that came with the page may have run out by now. A new one replaces it quietly.
    let stale = false;
    refreshTelegramStartLinkAction()
      .then((fresh) => {
        if (fresh && !stale) {
          setBot({ username: fresh.botUsername, startUrl: fresh.startUrl });
        }
      })
      .catch(() => undefined);

    return () => {
      stale = true;
    };
  }, [open, setup]);

  // Telegram tells the API when the operator presses Start; the drawer asks until that shows up.
  useEffect(() => {
    if (!open || step !== 'start' || waitedTooLong) {
      return;
    }

    let stale = false;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setWaitedTooLong(true);

        return;
      }

      const connected = await checkTelegramConnectedAction().catch(() => false);
      if (connected && !stale) {
        setStep('connected');
        router.refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      stale = true;
      clearInterval(timer);
    };
  }, [open, step, waitedTooLong, router]);

  function saveToken() {
    if (!found) {
      setError('Paste the message BotFather sent you, or just the token from it.');

      return;
    }

    setError(undefined);
    startSaving(async () => {
      const result = await saveTelegramTokenAction(found.token);
      if (!result.ok) {
        setError(result.error);

        return;
      }

      setBot({ username: result.botUsername, startUrl: result.startUrl });
      setWaitedTooLong(false);
      setStep('start');
    });
  }

  const botName = bot.username ? `@${bot.username}` : 'your bot';
  const stepStatus = (current: SetupStep, done: SetupStep[]) =>
    step === current ? 'current' : done.includes(step) ? 'done' : 'upcoming';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title="Set up Telegram"
        description="Give your agent its own Telegram bot. Takes about a minute."
        footer={
          step === 'connected' && (
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          )
        }
      >
        <Stepper>
          <Step
            index={1}
            title="Create a bot with BotFather"
            status={stepStatus('create', ['token', 'start', 'connected'])}
            summary="Bot created in Telegram"
            footer={
              <>
                <span />
                <Button onClick={() => setStep('token')}>I’ve created the bot</Button>
              </>
            }
          >
            <div className="flex flex-col gap-4.5 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <p className="text-[13px] leading-4.5 text-secondary">
                  Open @BotFather in Telegram and send /newbot. Pick a name people will see, and a username ending in
                  “bot”.
                </p>
                <CopyField value="/newbot" label="Copy the /newbot command" />
                <a
                  href={BOTFATHER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClassName('secondary', `${SMALL_BUTTON} self-start`)}
                >
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  Open @BotFather
                </a>
              </div>
              <figure className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="relative rounded-md bg-foreground p-2">
                  <QRCode
                    value={BOTFATHER_URL}
                    size={96}
                    level="H"
                    bgColor="#ebe2d6"
                    fgColor="#0a0908"
                    aria-label="QR code that opens @BotFather in Telegram"
                  />
                  <ChannelIcon
                    via="telegram"
                    className="absolute top-1/2 left-1/2 size-6 -translate-1/2 ring-2 ring-foreground"
                  />
                </div>
                <figcaption className="text-xs leading-4 text-muted">Scan to open on your phone</figcaption>
              </figure>
            </div>
          </Step>

          <Step
            index={2}
            title="Paste the bot token"
            status={error && step === 'token' ? 'error' : stepStatus('token', ['start', 'connected'])}
            summary={`${botName} · token saved`}
            footer={
              <>
                <Button variant="secondary" disabled={saving} onClick={() => setStep('create')}>
                  Back
                </Button>
                <Button pending={saving} onClick={saveToken}>
                  Save token
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-1.5">
              <Field
                label="Bot token"
                required
                error={
                  error && (
                    <span className="flex items-start gap-1.5">
                      <TriangleAlert aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                      {error}
                    </span>
                  )
                }
              >
                {(field) => (
                  <Input
                    {...field}
                    value={pasted}
                    onChange={(event) => {
                      const next = findBotToken(event.target.value);
                      if (next) {
                        setFoundLabel(next.username ? `Found the token for @${next.username}` : 'Found the token');
                      }

                      setPasted(event.target.value);
                      setError(undefined);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        saveToken();
                      }
                    }}
                    placeholder="Done! Congratulations on your new bot…"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                  />
                )}
              </Field>
              {/* The hint and the "found" line share one spot and cross-fade, so nothing below moves. */}
              <div className="grid text-xs leading-4">
                <p
                  aria-hidden={showsFound}
                  className={cn(SWAP_LAYER, 'text-muted', showsFound && '-translate-y-1 opacity-0')}
                >
                  Paste the whole BotFather message. We’ll find the token and store it encrypted.
                </p>
                <p
                  aria-live="polite"
                  aria-hidden={!showsFound}
                  className={cn(
                    SWAP_LAYER,
                    'flex items-center gap-1.5 text-success',
                    !showsFound && 'translate-y-1 opacity-0'
                  )}
                >
                  <Check aria-hidden="true" className="size-3 shrink-0" strokeWidth={3} />
                  {foundLabel}
                </p>
              </div>
            </div>
          </Step>

          <Step
            index={3}
            title="Say hi to your bot"
            status={stepStatus('start', ['connected'])}
            summary="Message received"
            glow
          >
            <p className="text-[13px] leading-4.5 text-secondary">
              Open {botName} and tap Start. Telegram sends /start for you, and that’s how it learns where to reach you.
            </p>
            <a
              href={bot.startUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonClassName('secondary', `${SMALL_BUTTON} self-start`)}
            >
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              Open {botName}
            </a>
            {waitedTooLong ? (
              <p className="flex flex-wrap items-center gap-2.5 text-xs leading-4 text-secondary">
                No /start yet.
                <Button variant="secondary" className={SMALL_BUTTON} onClick={() => setWaitedTooLong(false)}>
                  Keep waiting
                </Button>
              </p>
            ) : (
              <p aria-live="polite" className="flex items-center gap-2.5 pl-1 text-xs leading-4 text-secondary">
                <span
                  aria-hidden="true"
                  className="size-2 animate-pulse rounded-full bg-accent ring-4 ring-warning/45 motion-reduce:animate-none"
                />
                Waiting for /start…
              </p>
            )}
          </Step>

          {step === 'connected' && (
            <li>
              <Card
                glow
                aria-live="polite"
                className="flex animate-rise-in items-center gap-3 rounded-[10px] bg-background px-4.5 py-4 [--glow-color:var(--color-success)] motion-reduce:animate-none"
              >
                <ChannelIcon via="telegram" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-sm leading-5.25 font-medium text-foreground">Telegram connected</p>
                  <p className="text-xs leading-4 text-secondary">Your agent can now reach people as {botName}.</p>
                </div>
              </Card>
            </li>
          )}
        </Stepper>
      </DrawerContent>
    </Drawer>
  );
}

function botOf(setup: TelegramSetupState) {
  return {
    username: setup.step === 'create' ? '' : setup.botUsername,
    startUrl: setup.step === 'start' ? setup.startUrl : '',
  };
}

/**
 * Finds the token in whatever was pasted: the token alone, or BotFather's whole "Done! Congratulations…"
 * message, which also names the bot as `t.me/<username>`.
 */
function findBotToken(pasted: string): { token: string; username?: string } | null {
  const token = pasted.match(/\d{5,}:[\w-]{20,}/)?.[0];
  if (!token) {
    return null;
  }

  return { token, username: pasted.match(/t\.me\/(\w+)/)?.[1] };
}
