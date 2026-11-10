'use client';

import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

import {
  checkWhatsAppConnectedAction,
  connectWhatsAppAction,
  issueWhatsAppLinkAction,
  loadWhatsAppSetupAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { ChannelIcon } from '@/components/channels/channel-icon';
import {
  ConnectedCard,
  DRAWER_FOOTER,
  DRAWER_HEADER,
  FieldError,
  SetupCheck,
  useConnectionPoll,
} from '@/components/channels/setup-parts';
import { WhatsAppSignupButton } from '@/components/channels/whatsapp-signup-button';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { Step, Stepper } from '@/components/ui/stepper';
import { toast } from '@/components/ui/toast';
import type { WhatsAppLink } from '@/lib/human-channels-api';
import type { WhatsAppSetupState } from '@/lib/human-whatsapp-setup';

/** `checking` and `unreadable` only happen when the page couldn't read the setup and the drawer has to. */
type DrawerState =
  | { step: 'checking' }
  | { step: 'unreadable' }
  | { step: 'not-offered' }
  | { step: 'connect'; appId: string; configId: string }
  | { step: 'verify'; displayPhoneNumber?: string; reconnect?: MetaIds }
  | { step: 'connected'; displayPhoneNumber?: string; operatorPhoneNumber?: string; reconnect?: MetaIds };

type MetaIds = { appId: string; configId: string };

type WhatsAppSetupProps = {
  /** How far the setup got when the page loaded, so the drawer has something to show the moment it opens. */
  setup: WhatsAppSetupState;
  /** How the agent is called in a sentence: its address without the domain. */
  handle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The drawer that sets WhatsApp up: the operator connects their own WhatsApp Business account with Meta's
 * Facebook button, then proves their own number by sending a code to it from a wa.me link. The Configure
 * page's channels open it, and so does the last step of the onboarding.
 */
export function WhatsAppSetup({ setup, handle, open, onOpenChange }: WhatsAppSetupProps) {
  const router = useRouter();
  const [state, setState] = useState<DrawerState>(drawerStateOf(setup));
  const [error, setError] = useState<string>();
  const [link, setLink] = useState<WhatsAppLink>();
  const [linkError, setLinkError] = useState<string>();

  // The code on screen, so a page refresh while it still works doesn't swap it for another.
  const liveLink = useRef<WhatsAppLink>(undefined);

  // A code stops working after ten minutes, so a new one is made whenever the wait starts over.
  const refreshLink = useCallback(async () => {
    setLinkError(undefined);
    const result = await issueWhatsAppLinkAction().catch(() => null);
    if (result?.ok) {
      liveLink.current = { url: result.url, code: result.code, expiresAt: result.expiresAt };
    } else {
      liveLink.current = undefined;
      setLinkError(result?.error ?? 'We couldn’t make a code just now. Please try again.');
    }
    setLink(liveLink.current);
  }, []);

  const show = useCallback(
    (next: WhatsAppSetupState) => {
      setState(drawerStateOf(next));
      const live = liveLink.current && Date.parse(liveLink.current.expiresAt) > Date.now();
      if (next.step === 'verify' && !live) {
        void refreshLink();
      }
    },
    [refreshLink]
  );

  const check = useCallback(async () => {
    setState({ step: 'checking' });
    const next = await loadWhatsAppSetupAction().catch((): WhatsAppSetupState => ({ step: 'unknown' }));
    show(next);
    if (next.step === 'connected') {
      router.refresh();
    }
  }, [router, show]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(undefined);
    if (setup.step === 'unknown') {
      void check();
    } else {
      show(setup);
    }
  }, [open, setup, check, show]);

  // WhatsApp tells the API when the operator sends the code; the drawer asks until that shows up.
  const { waitedTooLong, keepWaiting } = useConnectionPoll({
    waiting: open && state.step === 'verify',
    check: () => checkWhatsAppConnectedAction(),
    onConnected: (connected) => {
      show(connected);
      router.refresh();
    },
  });

  const signupButton = (ids: MetaIds, mode: 'first' | 'again') => (
    <WhatsAppSignupButton
      appId={ids.appId}
      configId={ids.configId}
      mode={mode}
      connect={connectWhatsAppAction}
      onConnected={(result) => {
        setError(undefined);
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title="Set up WhatsApp"
        description={`Give ${handle} your own WhatsApp Business number. About two minutes.`}
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
        {(state.step === 'connect' || linked) && (
          <Stepper>
            <Step
              index={1}
              title="Connect your WhatsApp Business account"
              status={linked ? 'done' : error ? 'error' : 'current'}
              summary={businessNumber ? `${businessNumber} · connected` : 'Business number connected'}
            >
              <p className="text-[13px] leading-4.5 text-secondary">
                Sign in with Facebook and pick your Meta business, then the number {handle} should use. You need a Meta
                business and a phone number that isn’t on WhatsApp yet; Facebook walks you through adding one.
              </p>
              {state.step === 'connect' && signupButton(state, 'first')}
              {state.step === 'connect' && error && <SignupError message={error} />}
            </Step>

            <OwnNumberSteps
              state={state}
              handle={handle}
              sendCode={
                <SendCode
                  handle={handle}
                  businessNumber={businessNumber}
                  link={link}
                  linkError={linkError}
                  waitedTooLong={waitedTooLong}
                  onNewCode={() => {
                    keepWaiting();
                    void refreshLink();
                  }}
                />
              }
              reconnectButton={linked && state.reconnect ? signupButton(state.reconnect, 'again') : null}
              error={error}
            />
          </Stepper>
        )}
      </DrawerContent>
    </Drawer>
  );
}

type SetupStepState = Extract<DrawerState, { step: 'connect' | 'verify' | 'connected' }>;

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
}: {
  state: SetupStepState;
  handle: string;
  sendCode: ReactNode;
  reconnectButton: ReactNode;
  error?: string;
}) {
  const ownNumber = state.step === 'connected' ? state.operatorPhoneNumber : undefined;

  return (
    <>
      <Step
        index={2}
        title="Send yourself the code"
        status={state.step === 'connected' ? 'done' : state.step === 'verify' ? 'current' : 'upcoming'}
        summary={ownNumber ? `${ownNumber} · connected` : 'Your number is connected'}
        glow
      >
        {state.step === 'verify' && sendCode}
      </Step>

      {state.step === 'connected' && (
        <ConnectedCard via="whatsapp" title="WhatsApp connected">
          {ownNumber
            ? `${handle} can now reach you on WhatsApp at ${ownNumber}.`
            : `${handle} can now reach you on WhatsApp.`}
        </ConnectedCard>
      )}
      {reconnectButton && (
        <li className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2.5 text-xs leading-4 text-secondary">
            {state.step === 'verify'
              ? 'Your code gets no answer, or a different business number?'
              : `Messages not reaching ${handle}, or a different number?`}
            {reconnectButton}
          </p>
          {error && <SignupError message={error} />}
        </li>
      )}
    </>
  );
}

/** The wa.me link with the code typed in, a QR code to open it on a phone, and the code to type by hand. */
function SendCode({
  handle,
  businessNumber,
  link,
  linkError,
  waitedTooLong,
  onNewCode,
}: {
  handle: string;
  businessNumber?: string;
  link?: WhatsAppLink;
  linkError?: string;
  waitedTooLong: boolean;
  onNewCode: () => void;
}) {
  return (
    <>
      <p className="text-[13px] leading-4.5 text-secondary">
        Send this code to {businessNumber ?? 'your business number'} from the WhatsApp on your own phone. It proves the
        number is yours, so {handle} knows where to reach you.
      </p>
      {link ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="font-mono text-xl leading-6 tracking-[0.2em] text-foreground" aria-label="Your code">
              {link.code}
            </p>
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
                aria-label="QR code that opens WhatsApp with your code"
              />
              <ChannelIcon
                via="whatsapp"
                className="absolute top-1/2 left-1/2 size-6 -translate-1/2 [&>svg]:size-3.5"
              />
            </div>
            <figcaption className="text-xs leading-4 text-muted">Scan to open on your phone</figcaption>
          </figure>
        </div>
      ) : (
        linkError && <SignupError message={linkError} />
      )}
      {waitedTooLong || linkError ? (
        <p className="flex flex-wrap items-center gap-2.5 text-xs leading-4 text-secondary">
          {waitedTooLong ? 'No code yet, and this one has expired.' : null}
          <Button variant="secondary" className={SMALL_BUTTON} onClick={onNewCode}>
            Get a new code
          </Button>
        </p>
      ) : (
        <p className="text-xs leading-4 text-muted">Waiting for your message…</p>
      )}
    </>
  );
}

function SignupError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-xs leading-4 text-danger">
      <FieldError>{message}</FieldError>
    </p>
  );
}

function drawerStateOf(setup: WhatsAppSetupState): DrawerState {
  switch (setup.step) {
    case 'unknown':
      return { step: 'unreadable' };
    case 'hidden':
    case 'unavailable':
      return { step: 'not-offered' };
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
