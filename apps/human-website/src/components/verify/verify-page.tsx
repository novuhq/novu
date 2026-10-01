'use client';

import { useEffect, useState } from 'react';

import { Panel } from '@/components/invite/panel';
import { describeSender, InviteRequestError, type VerifyAddressResult, verifyAddress } from '@/lib/invite-api';

type VerifyState =
  | { phase: 'loading' }
  | { phase: 'success'; result: VerifyAddressResult }
  | { phase: 'failed'; reason: 'expired' | 'used' | 'superseded' | 'invalid' };

/**
 * Landing page for the "Verify this email" button. Claims the token once on
 * mount and shows success / expired / superseded / already-used states.
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
      <Panel eyebrow="verification" title="Confirming your email">
        <p className="font-mono text-sm tracking-tight text-foreground/50">
          Verifying
          <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
            ▍
          </span>
        </p>
      </Panel>
    );
  }

  if (state.phase === 'success') {
    return (
      <Panel
        eyebrow="verification"
        title={
          <>
            Email <em className="font-display tracking-tight text-accent">verified</em>
          </>
        }
        description={
          <>
            <span className="font-medium text-foreground">{describeSender(state.result)}</span> can now reach you at{' '}
            <span className="font-mono text-foreground">{state.result.address}</span>. You can close this tab.
          </>
        }
      />
    );
  }

  switch (state.reason) {
    case 'expired':
      return (
        <Panel
          eyebrow="verification"
          title={
            <>
              This link has <em className="font-display tracking-tight text-accent">expired</em>
            </>
          }
          description="Verification links work for 24 hours. Ask whoever invited you to resend one."
        />
      );
    case 'used':
      return (
        <Panel
          eyebrow="verification"
          title={
            <>
              Already <em className="font-display tracking-tight text-accent">verified</em>
            </>
          }
          description="This link was already used. You can close this tab."
        />
      );
    case 'superseded':
      return (
        <Panel
          eyebrow="verification"
          title={
            <>
              This link is <em className="font-display tracking-tight text-accent">out of date</em>
            </>
          }
          description="A newer verification was requested for this contact. Use the latest email, or ask for a new one."
        />
      );
    default:
      return (
        <Panel
          eyebrow="verification"
          title={
            <>
              This link <em className="font-display tracking-tight text-accent">isn&apos;t valid</em>
            </>
          }
          description="It may be incomplete or already replaced. Ask whoever invited you to send a new one."
        />
      );
  }
}
