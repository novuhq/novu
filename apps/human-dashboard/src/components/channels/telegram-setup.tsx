'use client';

import { ArrowUpRight, Check, RefreshCw, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import QRCode from 'react-qr-code';

import {
  checkTelegramConnectedAction,
  loadTelegramSetupAction,
  saveTelegramTokenAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { ChannelIcon } from '@/components/channels/channel-icon';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CopyField } from '@/components/ui/copy-field';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { Field, Input } from '@/components/ui/input';
import { Step, Stepper } from '@/components/ui/stepper';
import { Tooltip } from '@/components/ui/tooltip';

const BOTFATHER_URL = 'https://t.me/botfather';
const POLL_INTERVAL_MS = 2500;
/** After this long the drawer stops asking on its own, so a forgotten tab doesn't poll forever. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type SetupStep = 'loading' | 'create' | 'token' | 'start' | 'connected';

/** The drawer that walks through giving the agent a Telegram bot. The Channels table opens it. */
export function TelegramSetup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>('loading');
  const [bot, setBot] = useState({ username: '', startUrl: '' });
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string>();
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const [saving, startSaving] = useTransition();

  const found = findBotToken(pasted);

  // Reopening picks the setup up where it was left: a bot that's saved already goes straight to "say hi".
  useEffect(() => {
    if (!open) {
      return;
    }

    let stale = false;
    setStep('loading');
    setError(undefined);
    setPasted('');

    loadTelegramSetupAction()
      .then((setup) => {
        if (stale) {
          return;
        }

        if (setup.step !== 'create') {
          setBot({ username: setup.botUsername, startUrl: setup.step === 'start' ? setup.startUrl : '' });
        }
        setStep(setup.step);
      })
      .catch(() => {
        if (!stale) {
          setStep('create');
        }
      });

    return () => {
      stale = true;
    };
  }, [open]);

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
        {step === 'loading' ? (
          <p aria-live="polite" className="text-[13px] leading-4.5 text-secondary">
            Checking your setup…
          </p>
        ) : (
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
              action={
                step === 'start' || step === 'connected' ? (
                  <Tooltip label="Use another bot token">
                    <button
                      type="button"
                      aria-label="Use another bot token"
                      className={buttonClassName('ghost', '-my-1 -mr-1')}
                      onClick={() => {
                        setPasted('');
                        setError(undefined);
                        setStep('token');
                      }}
                    >
                      <RefreshCw aria-hidden="true" className="size-3.5" />
                    </button>
                  </Tooltip>
                ) : undefined
              }
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
              <Field
                label="Bot token"
                required
                hint={
                  found && (
                    <span className="flex items-center gap-1.5 text-success">
                      <Check aria-hidden="true" className="size-3 shrink-0" strokeWidth={3} />
                      {found.username ? `Found the token for @${found.username}` : 'Found the token'}
                    </span>
                  )
                }
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
              <p className="text-xs leading-4 text-muted">
                Paste the whole BotFather message. We’ll find the token and store it encrypted.
              </p>
            </Step>

            <Step
              index={3}
              title="Say hi to your bot"
              status={stepStatus('start', ['connected'])}
              summary="Message received"
              glow
            >
              <p className="text-[13px] leading-4.5 text-secondary">
                Open {botName} and tap Start. Telegram sends /start for you, and that’s how it learns where to reach
                you.
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
                  className="flex items-center gap-3 rounded-[10px] bg-background px-4.5 py-4 [--glow-color:var(--color-success)]"
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
        )}
      </DrawerContent>
    </Drawer>
  );
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
