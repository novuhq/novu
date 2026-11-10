'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ConnectWhatsAppResult } from '@/app/(account)/(dashboard)/channels/actions';
import { Button } from '@/components/ui/button';
import {
  type EmbeddedSignupSession,
  embeddedSignupLoginOptions,
  loadFacebookSdk,
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
};

/**
 * Opens Meta's Embedded Signup in a Facebook popup. Meta answers twice: `FB.login` with a code, and a
 * `WA_EMBEDDED_SIGNUP` message with the business account and number picked. The signup goes to the server
 * once both are in, in whichever order they arrive.
 */
export function WhatsAppSignupButton({ appId, configId, connect, onConnected, onError }: WhatsAppSignupButtonProps) {
  const [pending, setPending] = useState(false);
  const session = useRef<EmbeddedSignupSession | null>(null);
  const code = useRef<string | null>(null);
  const listener = useRef<((event: MessageEvent) => void) | null>(null);

  const stopListening = useCallback(() => {
    if (listener.current) {
      window.removeEventListener('message', listener.current);
      listener.current = null;
    }
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const fail = useCallback(
    (message: string) => {
      stopListening();
      session.current = null;
      code.current = null;
      setPending(false);
      onError(message);
    },
    [onError, stopListening]
  );

  const finishIfReady = useCallback(async () => {
    const picked = session.current;
    const signupCode = code.current;
    if (!picked || !signupCode) {
      return;
    }

    session.current = null;
    code.current = null;
    stopListening();

    try {
      const result = await connect({ code: signupCode, ...picked });
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
  }, [connect, onConnected, onError, stopListening]);

  const start = useCallback(async () => {
    setPending(true);
    session.current = null;
    code.current = null;
    stopListening();

    let sdk: Awaited<ReturnType<typeof loadFacebookSdk>>;
    try {
      sdk = await loadFacebookSdk(appId);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Facebook didn’t load. Please try again.');

      return;
    }

    listener.current = (event: MessageEvent) => {
      const picked = parseEmbeddedSignupEvent(event);
      if (picked === 'waba_only') {
        fail('Facebook finished without a phone number. Add one to your WhatsApp Business account and connect again.');

        return;
      }

      if (picked) {
        session.current = picked;
        void finishIfReady();
      }
    };
    window.addEventListener('message', listener.current);

    sdk.login((response) => {
      if (response.authResponse?.code) {
        code.current = response.authResponse.code;
        void finishIfReady();

        return;
      }

      // Closing the popup reads as `unknown`: the operator changed their mind, which needs no message.
      if (response.status === 'unknown') {
        stopListening();
        setPending(false);
      } else {
        fail('Facebook didn’t finish the setup. Please connect again.');
      }
    }, embeddedSignupLoginOptions(configId));
  }, [appId, configId, fail, finishIfReady, stopListening]);

  return (
    <Button className="self-start" pending={pending} onClick={() => void start()}>
      <FacebookMark />
      Continue with Facebook
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
