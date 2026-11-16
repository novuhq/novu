'use client';

import { ArrowUpRight, CreditCard, KeyRound, type LucideIcon, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

import {
  checkWhatsAppConnectedAction,
  connectWhatsAppAction,
  issueWhatsAppLinkAction,
  loadWhatsAppSetupAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { ComingSoonLogo } from '@/components/channels/coming-soon-logo';
import {
  AgentPromptCard,
  AgentPromptOption,
  DRAWER_FOOTER,
  DRAWER_HEADER,
  FieldError,
  SetupCheck,
  useConnectionPoll,
} from '@/components/channels/setup-parts';
import { WhatsAppOn } from '@/components/channels/whatsapp-first-message-card';
import { type SendCodeParts, WhatsAppKeysSteps } from '@/components/channels/whatsapp-keys-steps';
import { WhatsAppSignupButton } from '@/components/channels/whatsapp-signup-button';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyField } from '@/components/ui/copy-field';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { Step, Stepper, type StepStatus } from '@/components/ui/stepper';
import { toast } from '@/components/ui/toast';
import type { WhatsAppLink, WhatsAppWebhook } from '@/lib/human-channels-api';
import type { WhatsAppSetupState } from '@/lib/human-whatsapp-setup';
import type { FirstMessage } from '@/lib/whatsapp-first-message';

/** `checking` and `unreadable` only happen when the page couldn't read the setup and the drawer has to. */
type DrawerState =
  | { step: 'checking' }
  | { step: 'unreadable' }
  | { step: 'not-offered' }
  /** No Facebook button on this deployment (no Novu Meta app): keys from the operator's own Meta app still work. */
  | { step: 'keys-only' }
  | { step: 'connect'; appId: string; configId: string }
  | {
      step: 'verify';
      displayPhoneNumber?: string;
      reconnect?: MetaIds;
      firstMessage?: FirstMessage;
      webhook?: WhatsAppWebhook;
    }
  | {
      step: 'connected';
      displayPhoneNumber?: string;
      operatorPhoneNumber?: string;
      reconnect?: MetaIds;
      firstMessage?: FirstMessage;
    };

type MetaIds = { appId: string; configId: string };

type WhatsAppSetupProps = {
  /** How far the setup got when the page loaded, so the drawer has something to show the moment it opens. */
  setup: WhatsAppSetupState;
  /** How the agent is called in a sentence: its address without the domain. */
  handle: string;
  /** The agent's name, for the preview of its first message. Falls back to `handle`. */
  agentName?: string;
  /** What the operator hands their own agent, so it runs the setup with them. */
  prompt: string;
  /**
   * Opens on the steps rather than on the prompt: the drawer was opened from the link the operator's agent handed
   * over (`?setup=whatsapp`), so the agent is already on it.
   */
  startWithSteps?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Connect the business account, then say hi from your own WhatsApp. The first message comes after, on its own. */
const BY_HAND_STEPS = 2;

/**
 * The drawer that sets WhatsApp up. Before anything is connected it opens on the prompt for the operator's own
 * agent, which runs `channel add whatsapp` (or `channel_add`) and hands back the link to this drawer; the steps
 * for doing it by hand fold out under it. By hand, the operator connects their own WhatsApp Business account with
 * Meta's Facebook button, then connects their own number by sending it any message from a wa.me link. The Configure
 * page's channels open it, and so does the last step of the onboarding.
 */
export function WhatsAppSetup({
  setup,
  handle,
  agentName = handle,
  prompt,
  startWithSteps = false,
  open,
  onOpenChange,
}: WhatsAppSetupProps) {
  const router = useRouter();
  const [state, setState] = useState<DrawerState>(drawerStateOf(setup));
  const [byHand, setByHand] = useState(startWithSteps);
  // The steps for keys from the operator's own Meta app, instead of the Facebook button.
  const [withKeys, setWithKeys] = useState(false);
  const [error, setError] = useState<string>();
  const [link, setLink] = useState<WhatsAppLink>();
  const [linkError, setLinkError] = useState<string>();

  const expired = useExpired(link?.expiresAt);

  // The code on screen and the business number it opens, so a page refresh while it still works doesn't swap it
  // for another, while a different business number gets a link of its own.
  const liveLink = useRef<{ link: WhatsAppLink; businessNumber?: string }>(undefined);

  // A code stops working after ten minutes, so a new one is made whenever the wait starts over.
  const refreshLink = useCallback(async (businessNumber?: string) => {
    setLinkError(undefined);
    const result = await issueWhatsAppLinkAction().catch(() => null);
    if (result?.ok) {
      liveLink.current = {
        link: { url: result.url, expiresAt: result.expiresAt },
        businessNumber,
      };
    } else {
      liveLink.current = undefined;
      setLinkError(result?.error ?? 'We couldn’t get WhatsApp ready for your message. Please try again.');
    }
    setLink(liveLink.current?.link);
  }, []);

  const show = useCallback(
    (next: WhatsAppSetupState) => {
      setState(drawerStateOf(next));
      if (next.step !== 'verify') {
        return;
      }

      const live = liveLink.current;
      const reusable =
        live && Date.parse(live.link.expiresAt) > Date.now() && live.businessNumber === next.displayPhoneNumber;
      if (!reusable) {
        void refreshLink(next.displayPhoneNumber);
      }
    },
    [refreshLink]
  );

  const check = useCallback(async () => {
    setState({ step: 'checking' });
    const next = await loadWhatsAppSetupAction().catch((): WhatsAppSetupState => ({ step: 'unknown' }));
    // The way in couldn't be picked while the setup was unknown. Keys the operator already chose stay chosen.
    setWithKeys((chosen) => chosen || startsWithKeys(next));
    show(next);
    if (next.step === 'connected') {
      router.refresh();
    }
  }, [router, show]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (setup.step === 'unknown') {
      void check();
    } else {
      show(setup);
    }
  }, [open, setup, check, show]);

  // Each opening starts over, but only an opening: saving keys or connecting refreshes the page and hands the drawer
  // a new `setup`, which must not throw the operator back to the start or wipe the error they're reading.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only an opening picks the way; `setup` changes whenever the page refreshes, which must not switch it mid-setup.
  useEffect(() => {
    if (open) {
      setError(undefined);
      setByHand(startWithSteps);
      setWithKeys(startsWithKeys(setup));
    }
  }, [open, startWithSteps]);

  // Nothing is connected yet and the prompt is on screen: once the operator's agent got them through Meta's
  // signup (on this page, maybe in another tab), the drawer moves on to the steps that are left by itself.
  const view = viewOf(state, byHand);
  const agentPoll = useConnectionPoll({
    waiting: open && view === 'prompt',
    check: readSetupPastConnect,
    onConnected: (next) => {
      show(next);
      router.refresh();
    },
  });

  // WhatsApp tells the API when the operator's message arrives; the drawer asks until that shows up.
  const { waitedTooLong, keepWaiting } = useConnectionPoll({
    waiting: open && state.step === 'verify',
    check: () => checkWhatsAppConnectedAction(),
    onConnected: (connected) => {
      show(connected);
      router.refresh();
    },
  });

  const signupButton = (ids: MetaIds, mode: 'first' | 'again', aside?: ReactNode) => (
    <WhatsAppSignupButton
      appId={ids.appId}
      configId={ids.configId}
      mode={mode}
      aside={aside}
      connect={connectWhatsAppAction}
      onConnected={(result) => {
        setError(undefined);
        // A signup can pick a different business number: the code is made again, for the number just connected.
        liveLink.current = undefined;
        show({ step: 'verify', displayPhoneNumber: result.displayPhoneNumber, reconnect: ids });
        if (result.warning) {
          toast(result.warning, 'error');
        }
        router.refresh();
      }}
      onError={setError}
    />
  );

  const linked = state.step === 'verify' || state.step === 'connected';
  const businessNumber = linked ? state.displayPhoneNumber : undefined;
  const header = withKeys ? KEYS_HEADER : FACEBOOK_HEADER;
  const keys = keysViewOf(state, withKeys, () => setWithKeys(false));

  // Once both steps are done: WhatsApp is on, and the first message to set up, whichever way it was connected.
  const whatsAppOn = state.step === 'connected' && (
    <WhatsAppOn
      handle={handle}
      agentName={agentName}
      businessNumber={businessNumber}
      firstMessage={firstMessageOf(state)}
    />
  );
  const codeTimedOut = waitedTooLong || expired;
  const sendCode: SendCodeParts = {
    body: <SendCode handle={handle} businessNumber={businessNumber} link={link} linkError={linkError} />,
    footer: (
      <SendCodeStatus
        stale={codeTimedOut}
        failed={Boolean(linkError)}
        onNewCode={() => {
          keepWaiting();
          void refreshLink(businessNumber);
        }}
      />
    ),
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title={header.title}
        description={header.description}
        headerClassName={DRAWER_HEADER}
        footerClassName={DRAWER_FOOTER}
        footer={
          state.step === 'connected' && (
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          )
        }
      >
        {(state.step === 'checking' || state.step === 'unreadable') && (
          <SetupCheck
            state={state.step === 'checking' ? 'checking' : 'unavailable'}
            channel="WhatsApp"
            onRetry={() => void check()}
          />
        )}
        {state.step === 'not-offered' && (
          <p className="text-[13px] leading-4.5 text-secondary">
            WhatsApp can’t be connected here yet. Nothing was changed.
          </p>
        )}
        <AgentWay
          view={view}
          prompt={prompt}
          // From the agent's link the agent is already on it; once a number is linked, the steps are what's left.
          offerAlongsideSteps={state.step === 'connect' && !startWithSteps && !withKeys}
          waitedTooLong={agentPoll.waitedTooLong}
          onKeepWaiting={agentPoll.keepWaiting}
          onShowSteps={() => setByHand(true)}
        />
        {view === 'steps' && keys && (
          <Stepper>
            <WhatsAppKeysSteps
              state={keys.state}
              webhook={keys.webhook}
              sendCode={sendCode}
              whatsAppOn={whatsAppOn}
              onConnected={(result) => {
                show({ step: 'verify', displayPhoneNumber: result.displayPhoneNumber });
                router.refresh();
              }}
              onUseFacebook={keys.onUseFacebook}
            />
          </Stepper>
        )}
        {view === 'steps' && isSetupStep(state) && !withKeys && (
          <Stepper>
            <MetaStep
              handle={handle}
              linked={linked}
              businessNumber={businessNumber}
              error={state.step === 'connect' ? error : undefined}
              renderSignup={state.step === 'connect' ? (aside) => signupButton(state, 'first', aside) : undefined}
              onUseKeys={() => {
                setError(undefined);
                setWithKeys(true);
              }}
            />

            <OwnNumberSteps
              state={state}
              handle={handle}
              sendCode={sendCode}
              reconnectButton={linked && state.reconnect ? signupButton(state.reconnect, 'again') : null}
              error={error}
              whatsAppOn={whatsAppOn}
            />
          </Stepper>
        )}
      </DrawerContent>
    </Drawer>
  );
}

type SetupStepState = Extract<DrawerState, { step: 'connect' | 'verify' | 'connected' }>;

function connectStepStatus(linked: boolean, error?: string): StepStatus {
  if (linked) {
    return 'done';
  }

  return error ? 'error' : 'current';
}

const OWN_NUMBER_STEP_STATUS: Record<SetupStepState['step'], StepStatus> = {
  connect: 'upcoming',
  verify: 'current',
  connected: 'done',
};

/** Keys when there's no Facebook button, or when a keys setup still has its webhook to add in Meta. */
function startsWithKeys(setup: WhatsAppSetupState): boolean {
  return setup.step === 'unavailable' || (setup.step === 'verify' && Boolean(setup.webhook));
}

/**
 * The keys steps' view of the setup: a deployment without the Facebook button starts them from nothing, a webhook
 * still to add comes along, and going back to Facebook is offered only while nothing is saved and it's there.
 */
function keysViewOf(
  state: DrawerState,
  withKeys: boolean,
  useFacebook: () => void
): { state: SetupStepState | { step: 'connect' }; webhook?: WhatsAppWebhook; onUseFacebook?: () => void } | null {
  if (!withKeys) {
    return null;
  }

  if (state.step === 'keys-only') {
    return { state: { step: 'connect' } };
  }

  if (!isSetupStep(state)) {
    return null;
  }

  return {
    state,
    ...(state.step === 'verify' && state.webhook ? { webhook: state.webhook } : {}),
    ...(state.step === 'connect' ? { onUseFacebook: useFacebook } : {}),
  };
}

function isSetupStep(state: DrawerState): state is SetupStepState {
  return state.step === 'connect' || state.step === 'verify' || state.step === 'connected';
}

type AgentWayProps = {
  view: 'prompt' | 'steps' | null;
  prompt: string;
  /** Whether the steps keep the prompt above them, for an operator who changed their mind. */
  offerAlongsideSteps: boolean;
  waitedTooLong: boolean;
  onKeepWaiting: () => void;
  onShowSteps: () => void;
};

/** The operator's agent as the way in: the whole drawer while the steps are folded away, a card above them after. */
function AgentWay({ view, prompt, offerAlongsideSteps, waitedTooLong, onKeepWaiting, onShowSteps }: AgentWayProps) {
  if (view === 'prompt') {
    return (
      <AgentPromptCard
        prompt={prompt}
        stepCount={BY_HAND_STEPS}
        waitedTooLong={waitedTooLong}
        onKeepWaiting={onKeepWaiting}
        onShowSteps={onShowSteps}
      />
    );
  }

  return view === 'steps' && offerAlongsideSteps ? <AgentPromptOption prompt={prompt} /> : null;
}

/**
 * Step 2, proving the operator's own number, then what the finished setup says. Under them, connecting the
 * business account again: the number is saved before Meta's webhook is set up, so a half-finished setup is fixed
 * from here.
 */
function OwnNumberSteps({
  state,
  handle,
  sendCode,
  reconnectButton,
  error,
  whatsAppOn,
}: {
  state: SetupStepState;
  handle: string;
  sendCode: SendCodeParts;
  reconnectButton: ReactNode;
  error?: string;
  /** What closes the steps once both are done: WhatsApp is on, and the first message. */
  whatsAppOn: ReactNode;
}) {
  const ownNumber = state.step === 'connected' ? state.operatorPhoneNumber : undefined;

  return (
    <>
      <Step
        index={2}
        title="Say hi on WhatsApp"
        status={OWN_NUMBER_STEP_STATUS[state.step]}
        summary={ownNumber ? `Message received from ${ownNumber}` : 'Your number is connected'}
        footer={sendCode.footer}
        glow
      >
        {state.step === 'verify' && sendCode.body}
      </Step>

      {whatsAppOn}
      {reconnectButton && (
        <li className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2.5 text-xs leading-4 text-secondary">
            {state.step === 'verify'
              ? 'Your message gets no answer, or a different business number?'
              : `Messages not reaching ${handle}, or a different number?`}
            {reconnectButton}
          </p>
          {error && <SignupError message={error} />}
        </li>
      )}
    </>
  );
}

/**
 * The business number to write to, the wa.me link with a hello ready to send, and a QR code to open it on a phone.
 * No code: while this step waits, the first message from a number that isn't connected yet binds it as the operator's.
 */
function SendCode({
  handle,
  businessNumber,
  link,
  linkError,
}: {
  handle: string;
  businessNumber?: string;
  link?: WhatsAppLink;
  linkError?: string;
}) {
  if (!link) {
    return linkError ? <SignupError message={linkError} /> : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4.5">
      <div className="flex min-w-0 flex-1 basis-60 flex-col gap-2.5">
        <p className="text-[13px] leading-4.5 text-secondary">
          From your own phone, send any message to {handle}’s new number.
        </p>
        {businessNumber && <CopyField value={businessNumber} label={`Copy ${handle}’s WhatsApp number`} />}
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName('secondary', `${SMALL_BUTTON} self-start`)}
        >
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          Open WhatsApp
        </a>
      </div>
      <figure className="flex shrink-0 flex-col items-center gap-1.5">
        <div className="relative rounded-md bg-foreground p-2">
          <QRCode
            value={link.url}
            size={96}
            level="H"
            bgColor="#ebe2d6"
            fgColor="#0a0908"
            aria-label="QR code that opens WhatsApp with a message ready to send"
          />
          <span className="absolute top-1/2 left-1/2 flex -translate-1/2 rounded-full bg-foreground p-1">
            <ComingSoonLogo via="whatsapp" size={24} />
          </span>
        </div>
        <figcaption className="text-xs leading-4 text-muted">Scan to open on your phone</figcaption>
      </figure>
    </div>
  );
}

/** The step's footer: waiting for the message, or a way to wait again once the window closed. */
function SendCodeStatus({ stale, failed, onNewCode }: { stale: boolean; failed: boolean; onNewCode: () => void }) {
  if (stale || failed) {
    return (
      <>
        <p className="text-xs text-secondary">{stale ? 'Your message didn’t arrive in time.' : 'Not ready yet.'}</p>
        <Button variant="secondary" className={SMALL_BUTTON} onClick={onNewCode}>
          Wait again
        </Button>
      </>
    );
  }

  return (
    <p aria-live="polite" className="flex items-center gap-2 text-xs text-foreground">
      <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-accent" />
      Waiting for your message
    </p>
  );
}

/** Whether a deadline has passed, turning true the moment it does. */
function useExpired(deadline: string | undefined): boolean {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) {
      setExpired(false);

      return;
    }

    const left = Date.parse(deadline) - Date.now();
    setExpired(left <= 0);
    if (left <= 0) {
      return;
    }

    const timer = setTimeout(() => setExpired(true), left);

    return () => clearTimeout(timer);
  }, [deadline]);

  return expired;
}

const FACEBOOK_HEADER = {
  title: 'Enable WhatsApp Business',
  description: 'Connect your WhatsApp Business account. About five minutes.',
};

const KEYS_HEADER = {
  title: 'Connect WhatsApp Business with API keys',
  description: 'For a Meta app you already set up. About ten minutes.',
};

type MetaStepProps = {
  handle: string;
  linked: boolean;
  businessNumber?: string;
  error?: string;
  /** The Facebook button while the step is still to do, with what goes beside it. It owns the whole footer. */
  renderSignup?: (aside: ReactNode) => ReactNode;
  onUseKeys: () => void;
};

/** Step 1 the Facebook way: Meta's Embedded Signup, with the way to API keys beside its button. */
function MetaStep({ handle, linked, businessNumber, error, renderSignup, onUseKeys }: MetaStepProps) {
  return (
    <Step
      index={1}
      title="Connect with Meta"
      status={connectStepStatus(linked, error)}
      summary={businessNumber ? `${businessNumber} · connected` : 'Business number connected'}
      footer={renderSignup?.(
        <button
          type="button"
          onClick={onUseKeys}
          className="flex cursor-pointer items-center gap-1.5 text-xs text-secondary transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
        >
          <KeyRound aria-hidden="true" className="size-[13px]" />
          Have API keys? Connect manually
        </button>
      )}
    >
      <p className="text-[13px] leading-4.5 text-secondary">
        Log in with Facebook, pick your Meta Business account and add the number {handle} will use. Meta texts it a code
        to confirm.
      </p>
      <StepHint icon={Phone}>Use a number just for {handle}. It can’t be on personal WhatsApp.</StepHint>
      <StepHint icon={CreditCard}>
        Meta bills messages to your Meta Business account. Keep a card on file there.
      </StepHint>
      {error && <SignupError message={error} />}
    </Step>
  );
}

/** A line of what to have ready, under a step's instructions, with its icon. */
function StepHint({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-4 text-secondary">
      <Icon aria-hidden="true" className="mt-px size-[13px] shrink-0" />
      {children}
    </p>
  );
}

function SignupError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-xs leading-4 text-danger">
      <FieldError>{message}</FieldError>
    </p>
  );
}

/**
 * What the drawer's body shows once the setup was read: the prompt for the operator's agent while nothing is
 * connected and the steps are folded away, the steps otherwise.
 */
function viewOf(state: DrawerState, byHand: boolean): 'prompt' | 'steps' | null {
  if (state.step === 'keys-only') {
    return 'steps';
  }

  if (state.step === 'connect') {
    return byHand ? 'steps' : 'prompt';
  }

  return state.step === 'verify' || state.step === 'connected' ? 'steps' : null;
}

/** The setup, once the business account is connected: what the prompt view waits for. */
async function readSetupPastConnect(): Promise<WhatsAppSetupState | null> {
  const next = await loadWhatsAppSetupAction();

  return next.step === 'verify' || next.step === 'connected' ? next : null;
}

function drawerStateOf(setup: WhatsAppSetupState): DrawerState {
  switch (setup.step) {
    case 'unknown':
      return { step: 'unreadable' };
    case 'hidden':
      return { step: 'not-offered' };
    case 'unavailable':
      return { step: 'keys-only' };
    case 'connect':
    case 'verify':
    case 'connected':
      return setup;
    default: {
      const exhaustive: never = setup;

      return exhaustive;
    }
  }
}

/** Where the first message stands, once a business number is linked. */
function firstMessageOf(state: DrawerState): FirstMessage | undefined {
  return state.step === 'verify' || state.step === 'connected' ? state.firstMessage : undefined;
}
