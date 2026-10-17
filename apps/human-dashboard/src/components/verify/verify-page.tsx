'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { describeSender, InviteRequestError, type VerifyAddressResult, verifyAddress } from '@/lib/invite-api';

type VerifyState =
  | { phase: 'loading' }
  | { phase: 'success'; result: VerifyAddressResult }
  | { phase: 'failed'; reason: 'expired' | 'used' | 'superseded' | 'invalid' };

/**
 * Landing page for the "Verify this email" button. Claims the token once on
 * mount and shows success, expired, superseded, or already-used.
 */
export function VerifyPage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [state, setState] = useState<VerifyState>({ phase: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const result = await verifyAddress(apiUrl, token, controller.signal);
        if (!controller.signal.aborted) {
          setState({ phase: 'success', result });
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof InviteRequestError) {
          switch (error.code) {
            case 'token_expired':
              setState({ phase: 'failed', reason: 'expired' });

              return;
            case 'verification_used':
              setState({ phase: 'failed', reason: 'used' });

              return;
            case 'verification_superseded':
              setState({ phase: 'failed', reason: 'superseded' });

              return;
            default:
              setState({ phase: 'failed', reason: 'invalid' });

              return;
          }
        }

        setState({ phase: 'failed', reason: 'invalid' });
      }
    })();

    return () => controller.abort();
  }, [apiUrl, token]);

  if (state.phase === 'loading') {
    return (
      <VerifyCard>
        <h1 className="text-base leading-6 font-medium">Confirming your email</h1>
        <output className="block font-mono text-[13px] leading-4.5 text-secondary">
          Verifying
          <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
            ▍
          </span>
        </output>
      </VerifyCard>
    );
  }

  if (state.phase === 'success') {
    return (
      <VerifyCard>
        <img src="/illustrations/state-success.svg" alt="" width={120} height={120} className="size-30" />
        <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
          Email <em className="font-display text-[26px] tracking-[-0.75px] text-accent">verified</em>
        </h1>
        <p className="text-[13px] leading-4.5 text-secondary">
          <span className="font-medium text-foreground">{describeSender(state.result)}</span> can now reach you at{' '}
          <span className="font-mono text-foreground">{state.result.address}</span>. You can close this tab.
        </p>
      </VerifyCard>
    );
  }

  const failed = failedCopy(state.reason);

  return (
    <VerifyCard>
      <img src="/illustrations/state-error.svg" alt="" width={120} height={120} className="size-30" />
      <h1 className="text-base leading-6 font-medium">{failed.title}</h1>
      <p className="text-[13px] leading-4.5 text-secondary">{failed.text}</p>
    </VerifyCard>
  );
}

function failedCopy(reason: 'expired' | 'used' | 'superseded' | 'invalid'): { title: string; text: string } {
  switch (reason) {
    case 'expired':
      return {
        title: 'This link has expired',
        text: 'Verification links work for 24 hours. Ask whoever invited you to resend one.',
      };
    case 'used':
      return {
        title: 'Already verified',
        text: 'This link was already used. You can close this tab.',
      };
    case 'superseded':
      return {
        title: 'This link is out of date',
        text: 'A newer verification was requested for this contact. Use the latest email, or ask for a new one.',
      };
    case 'invalid':
      return {
        title: "This link isn't valid",
        text: 'It may be incomplete or already replaced. Ask whoever invited you to send a new one.',
      };
    default: {
      const unreachable: never = reason;

      return unreachable;
    }
  }
}

function VerifyCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate w-full max-w-120 overflow-hidden rounded-xl border border-border bg-background">
      <img
        src="/illustrations/dither-corner.svg"
        alt=""
        width={480}
        height={320}
        className="pointer-events-none absolute top-0 right-0 -z-10 h-80 w-120 max-w-none select-none"
      />
      <div className="flex flex-col gap-5.5 p-5 sm:p-8">{children}</div>
    </div>
  );
}
