'use client';

import { ArrowUpRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import type { ConnectWhatsAppResult } from '@/app/(account)/(dashboard)/channels/actions';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import {
  createSignupPairing,
  embeddedSignupLoginOptions,
  loadFacebookSdk,
  type PairedSignup,
  parseEmbeddedSignupEvent,
} from '@/lib/facebook-embedded-signup';
import type { WhatsAppSignup } from '@/lib/human-channels-api';

/** The design's "Continue with Facebook": a light button with Meta's logo, set apart from the orange actions. */
const FIRST_BUTTON =
  'ml-auto gap-2 bg-foreground pr-3.5 pl-3 text-background hover:bg-foreground/90 disabled:hover:bg-foreground';

type WhatsAppSignupButtonProps = {
  appId: string;
  configId: string;
  /** Finishes the signup on the server with what Meta handed back. */
  connect: (signup: WhatsAppSignup) => Promise<ConnectWhatsAppResult>;
  onConnected: (result: Extract<ConnectWhatsAppResult, { ok: true }>) => void;
  onError: (message: string) => void;
  /** `again` is the quieter button under a connected number, for when messages don't arrive. */
  mode?: 'first' | 'again';
  /**
   * Beside the `first` button while nothing runs, such as the way to API keys. The whole step footer is this
   * button's: while Meta's window is open it says so instead, with a way to open the window again.
   */
  aside?: ReactNode;
};

/** Where an attempt is: nothing running, Meta's window open, or what Meta handed back on its way to the API. */
type Phase = 'idle' | 'window' | 'saving';

/**
 * Opens Meta's Embedded Signup in a Facebook popup. Meta answers twice: `FB.login` with a code, and a
 * `WA_EMBEDDED_SIGNUP` message with the business account and number picked. The signup goes to the server
 * once both are in, in whichever order they arrive, and the attempt is given up when one never comes.
 */
export function WhatsAppSignupButton({
  appId,
  configId,
  connect,
  onConnected,
  onError,
  mode = 'first',
  aside,
}: WhatsAppSignupButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  // Which attempt is the live one: "Reopen window" starts another while the first popup may still be open, and that
  // popup's late answer must not cancel the newer attempt.
  const attemptSeq = useRef(0);
  const attempt = useRef<{ pairing: ReturnType<typeof createSignupPairing>; listener: (event: MessageEvent) => void }>(
    null
  );

  /** Ends the current attempt: stops listening to Meta and waiting for its other answer. */
  const endAttempt = useCallback(() => {
    if (attempt.current) {
      attempt.current.pairing.cancel();
      window.removeEventListener('message', attempt.current.listener);
      attempt.current = null;
    }
  }, []);

  useEffect(() => endAttempt, [endAttempt]);

  const fail = useCallback(
    (message: string) => {
      endAttempt();
      setPhase('idle');
      onError(message);
    },
    [endAttempt, onError]
  );

  const finish = useCallback(
    async (signup: PairedSignup) => {
      endAttempt();
      setPhase('saving');

      try {
        const result = await connect(signup);
        if (result.ok) {
          onConnected(result);
        } else {
          onError(result.error);
        }
      } catch {
        onError('Something went wrong while connecting WhatsApp. Please try again.');
      } finally {
        setPhase('idle');
      }
    },
    [connect, endAttempt, onConnected, onError]
  );

  const start = useCallback(async () => {
    attemptSeq.current += 1;
    const mine = attemptSeq.current;
    const stale = () => attemptSeq.current !== mine;
    endAttempt();
    setPhase('window');

    let sdk: Awaited<ReturnType<typeof loadFacebookSdk>>;
    try {
      sdk = await loadFacebookSdk(appId);
    } catch (error) {
      if (!stale()) {
        fail(error instanceof Error ? error.message : 'Facebook didn’t load. Please try again.');
      }

      return;
    }

    if (stale()) {
      return;
    }

    const pairing = createSignupPairing({
      onReady: (signup) => void finish(signup),
      onTimeout: () => fail('Facebook didn’t say which number you picked. Please connect again.'),
    });
    const listener = (event: MessageEvent) => {
      const picked = parseEmbeddedSignupEvent(event);
      if (picked === 'waba_only') {
        fail('Facebook finished without a phone number. Add one to your WhatsApp Business account and connect again.');
      } else if (picked) {
        pairing.session(picked);
      }
    };
    attempt.current = { pairing, listener };
    window.addEventListener('message', listener);

    sdk.login((response) => {
      if (stale()) {
        return;
      }

      if (response.authResponse?.code) {
        pairing.code(response.authResponse.code);

        return;
      }

      // Closing the popup reads as `unknown`: the operator changed their mind, which needs no message.
      if (response.status === 'unknown') {
        endAttempt();
        setPhase('idle');
      } else {
        fail('Facebook didn’t finish the setup. Please connect again.');
      }
    }, embeddedSignupLoginOptions(configId));
  }, [appId, configId, endAttempt, fail, finish]);

  if (mode === 'again') {
    return (
      <Button
        variant="secondary"
        className={`${SMALL_BUTTON} self-start`}
        pending={phase !== 'idle'}
        onClick={() => void start()}
      >
        <FacebookMark />
        Connect again
      </Button>
    );
  }

  if (phase === 'window') {
    return (
      <>
        <MetaWaitLine>Finish the steps in the Meta window</MetaWaitLine>
        {/* A popup the browser blocked, or one lost behind this window, opens again from here. */}
        <Button variant="secondary" className="ml-auto" onClick={() => void start()}>
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          Reopen window
        </Button>
      </>
    );
  }

  if (phase === 'saving') {
    return <MetaWaitLine>Connecting your number…</MetaWaitLine>;
  }

  return (
    <>
      {aside}
      <Button className={FIRST_BUTTON} onClick={() => void start()}>
        {/* Meta's own logo in its colors, as the design has it on the light button. */}
        <img src="/brand/facebook.svg" alt="" width={16} height={16} className="size-4 shrink-0" />
        Continue with Facebook
      </Button>
    </>
  );
}

/** The step footer's line while Meta's side of the signup runs. */
function MetaWaitLine({ children }: { children: ReactNode }) {
  return (
    <p aria-live="polite" className="flex items-center gap-2 text-xs text-foreground">
      <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-warning" />
      {children}
    </p>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-3.5 shrink-0">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
