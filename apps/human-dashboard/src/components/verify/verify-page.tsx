'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { Brand } from '@/components/site/brand';
import { InviteRequestError, type VerifyAddressResult, verifyAddress } from '@/lib/invite-api';
import { cn } from '@/lib/utils';

const SITE_URL = 'https://agentinbox.md';

type FailedReason = 'expired' | 'used' | 'superseded' | 'invalid';

type VerifyState =
  | { phase: 'loading' }
  | { phase: 'success'; result: VerifyAddressResult }
  | { phase: 'failed'; reason: FailedReason };

/**
 * Landing page for the "Confirm email" button: light like the email it came from. Claims the token once on
 * mount and shows the result. The states are the same size, so one fades into the next without a jump.
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

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f5f3ef] px-3 py-4 sm:px-4 sm:py-8">
      <main className="flex w-full max-w-[416px] flex-col gap-[18px] rounded-2xl border border-[#e7e2da] bg-white p-6 sm:p-8">
        <Brand href={SITE_URL} onLight />
        <div
          key={state.phase === 'failed' ? state.reason : state.phase}
          className="flex animate-rise-in flex-col gap-[18px] motion-reduce:animate-none"
        >
          <StateContent state={state} />
        </div>
      </main>
    </div>
  );
}

function StateContent({ state }: { state: VerifyState }) {
  if (state.phase === 'loading') {
    return (
      <>
        <Badge tone="neutral">…</Badge>
        <Title>Confirming your email</Title>
        <Text>This only takes a moment.</Text>
      </>
    );
  }

  if (state.phase === 'success') {
    const { agentName, address } = state.result;

    return (
      <>
        <Badge tone="success">
          {/* The design's check comes from a fallback font, so every device would draw another one. This is its shape. */}
          <svg viewBox="0 0 36 36" className="size-9" fill="currentColor">
            <path d="M23.4 12.1 L21.6 12.1 Q19.6 13.4 17.9 15.8 Q16.4 17.8 15.2 20.2 Q14.8 20.9 14.5 20.8 Q14.3 19.4 13.9 19.1 Q13.4 18.8 11.9 19.7 L13.3 24 Q14.2 24.1 15 23.9 Q16.6 21.4 18.8 17.8 Q20.9 14.9 23.4 12.1 Z" />
          </svg>
        </Badge>
        <Title>You’re in</Title>
        <Text>
          {agentName ?? 'Your agent'} can reach you at {address} now. It writes like a normal person. Mostly.
        </Text>
      </>
    );
  }

  const failed = failedCopy(state.reason);

  return (
    <>
      <Badge tone="neutral">–</Badge>
      <Title>{failed.title}</Title>
      <Text>{failed.text}</Text>
    </>
  );
}

function failedCopy(reason: FailedReason): { title: string; text: string } {
  switch (reason) {
    case 'expired':
      return {
        title: 'This link timed out',
        text: 'Confirm links work for 24 hours. Ask for a new one.',
      };
    case 'used':
      return {
        title: 'This link already did its job',
        text: 'Each link works once, and this one already confirmed your email. You can close this tab.',
      };
    case 'superseded':
      return {
        title: 'There’s a newer link',
        text: 'A newer email went out after this one. Use the link in that one.',
      };
    case 'invalid':
      return {
        title: 'This link doesn’t work',
        text: 'It may be incomplete. Ask for a new one.',
      };
    default: {
      const unreachable: never = reason;

      return unreachable;
    }
  }
}

function Badge({ tone, children }: { tone: 'success' | 'neutral'; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex size-9 items-center justify-center rounded-full text-base leading-[21px] font-medium',
        tone === 'success' ? 'bg-[#e8f8ee] text-[#1b9955]' : 'bg-[#faf8f5] text-[#8a8279]'
      )}
    >
      {children}
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-[22px] leading-[27.5px] font-medium tracking-[-0.33px] text-[#1a1714]">{children}</h1>;
}

function Text({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-6 text-[#4a443d]">{children}</p>;
}
