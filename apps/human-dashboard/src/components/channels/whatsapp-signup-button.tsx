'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

type WhatsAppSignupButtonProps = {
  appId: string;
  configId: string;
  /** Finishes the signup on the server with what Meta handed back. */
  connect: (signup: WhatsAppSignup) => Promise<ConnectWhatsAppResult>;
  onConnected: (result: Extract<ConnectWhatsAppResult, { ok: true }>) => void;
  onError: (message: string) => void;
  /** `again` is the quieter button under a connected number, for when messages don't arrive. */
  mode?: 'first' | 'again';
};

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
}: WhatsAppSignupButtonProps) {
  const [pending, setPending] = useState(false);
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
      setPending(false);
      onError(message);
    },
    [endAttempt, onError]
  );

  const finish = useCallback(
    async (signup: PairedSignup) => {
      endAttempt();

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
        setPending(false);
      }
    },
    [connect, endAttempt, onConnected, onError]
  );

  const start = useCallback(async () => {
    endAttempt();
    setPending(true);

    let sdk: Awaited<ReturnType<typeof loadFacebookSdk>>;
    try {
      sdk = await loadFacebookSdk(appId);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Facebook didn’t load. Please try again.');

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
      if (response.authResponse?.code) {
        pairing.code(response.authResponse.code);

        return;
      }

      // Closing the popup reads as `unknown`: the operator changed their mind, which needs no message.
      if (response.status === 'unknown') {
        endAttempt();
        setPending(false);
      } else {
        fail('Facebook didn’t finish the setup. Please connect again.');
      }
    }, embeddedSignupLoginOptions(configId));
  }, [appId, configId, endAttempt, fail, finish]);

  return (
    <Button
      variant={mode === 'again' ? 'secondary' : 'primary'}
      className={mode === 'again' ? `${SMALL_BUTTON} self-start` : 'self-start'}
      pending={pending}
      onClick={() => void start()}
    >
      <FacebookMark />
      {mode === 'again' ? 'Connect again' : 'Continue with Facebook'}
    </Button>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-3.5 shrink-0">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
