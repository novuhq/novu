import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { RiCheckLine, RiTerminalBoxLine, RiTimeLine, RiWhatsappLine } from 'react-icons/ri';
import { useParams } from 'react-router-dom';
import {
  completeWhatsAppSignupPublic,
  getWhatsAppSignupLinkStatus,
  type WhatsAppEmbeddedSignupResult,
  type WhatsAppSignupLinkStatus,
  WhatsAppSignupSubmitError,
} from '@/api/integrations';
import { Card, PageShell } from '@/components/agents/public-token-page';
import { WhatsAppEmbeddedSignupCoreButton } from '@/components/agents/whatsapp-embedded-signup-button';
import { isWhatsAppEmbeddedSignupConfigured } from '@/config';

/**
 * Public, unauthenticated WhatsApp Embedded Signup page opened by
 * `npx novu connect` (keyless or authenticated). Authorization is carried by
 * the opaque single-use token in the URL — the CLI mints it, opens this page,
 * and polls the same token until Embedded Signup completes. So this page stays
 * intentionally small: one "Log in with Facebook" button and a "return to your
 * terminal" success state.
 */
export function AgentWhatsAppSignupPage() {
  const { token = '' } = useParams<{ token: string }>();

  const statusQuery = useQuery<WhatsAppSignupLinkStatus>({
    queryKey: ['whatsapp-signup-link-status', token],
    queryFn: ({ signal }) => getWhatsAppSignupLinkStatus(token, signal),
    enabled: token.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { showError: false },
  });

  return (
    <PageShell>
      {!token && <InactiveLinkCard reason="invalid" />}
      {token && statusQuery.isLoading && <LoadingCard />}
      {token && statusQuery.isError && <InactiveLinkCard reason="invalid" />}
      {token && statusQuery.data && !statusQuery.data.valid && <InactiveLinkCard reason={statusQuery.data.reason} />}
      {token && statusQuery.data?.valid && <SignupFlow token={token} status={statusQuery.data} />}
    </PageShell>
  );
}

function SignupFlow({ token, status }: { token: string; status: Extract<WhatsAppSignupLinkStatus, { valid: true }> }) {
  const [result, setResult] = useState<WhatsAppEmbeddedSignupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inactiveReason, setInactiveReason] = useState<'expired' | 'used' | 'invalid' | null>(null);

  if (inactiveReason) {
    return <InactiveLinkCard reason={inactiveReason} />;
  }

  // Credentials may already be saved (re-run of the CLI, or a retry after a
  // webhook hiccup) — jump straight to the success state.
  if (result?.success || status.credentialsSaved) {
    return <SuccessCard displayPhoneNumber={result?.displayPhoneNumber ?? status.displayPhoneNumber} />;
  }

  if (!isWhatsAppEmbeddedSignupConfigured()) {
    return (
      <Card>
        <div className="flex flex-col gap-2">
          <h1 className="text-text-strong text-paragraph-md font-semibold">WhatsApp signup is not available</h1>
          <p className="text-text-soft text-paragraph-xs leading-5">
            Embedded Signup is not configured on this deployment. Return to your terminal — the CLI will guide you
            through an alternative setup.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <p className="text-text-soft text-label-xs uppercase tracking-wide">Connect WhatsApp Business</p>
        <h1 className="text-text-strong text-paragraph-md font-medium leading-snug">
          Finish setup for <span className="font-semibold">{status.agentName}</span>
        </h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          Log in with Facebook to share your WhatsApp Business account with Novu — we save the credentials and register
          the webhook automatically. Keep your terminal open: the CLI resumes as soon as signup completes.
        </p>
      </div>

      <div className="mt-5 flex justify-center">
        <WhatsAppEmbeddedSignupCoreButton
          completeSignup={async (completion) => {
            try {
              return await completeWhatsAppSignupPublic({ token, ...completion });
            } catch (err) {
              if (err instanceof WhatsAppSignupSubmitError) {
                if (err.code === 'token_already_used') setInactiveReason('used');
                if (err.code === 'token_expired') setInactiveReason('expired');
                if (err.code === 'token_invalid') setInactiveReason('invalid');
              }

              throw err;
            }
          }}
          onSuccess={(signupResult) => {
            setErrorMessage(null);
            setResult(signupResult);
          }}
          onError={(message) => setErrorMessage(message)}
        />
      </div>

      {errorMessage ? <p className="text-error-base text-label-xs mt-3 text-center leading-4">{errorMessage}</p> : null}
    </Card>
  );
}

function SuccessCard({ displayPhoneNumber }: { displayPhoneNumber?: string }) {
  const waMeUrl = buildWaMeUrl(displayPhoneNumber);

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-success-base/10 text-success-base flex size-12 items-center justify-center rounded-full">
          <RiCheckLine className="size-6" />
        </div>
        <h1 className="text-text-strong text-paragraph-md font-semibold">WhatsApp signup complete</h1>
        <p className="text-text-soft text-paragraph-xs leading-5">
          Your WhatsApp Business account is connected. Return to your terminal — the CLI picks up from here and walks
          you through sending a test message.
        </p>
      </div>

      {waMeUrl ? (
        <a
          href={waMeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-text-strong text-static-white hover:bg-text-strong/90 mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-10 px-3.5 text-label-sm transition"
        >
          <RiWhatsappLine className="size-4" />
          Message {displayPhoneNumber} on WhatsApp
        </a>
      ) : null}

      <div className="border-stroke-soft bg-bg-weak text-text-sub mt-5 flex items-center justify-center gap-2 rounded-md border p-2.5">
        <RiTerminalBoxLine className="size-4 shrink-0" />
        <span className="text-label-xs font-medium">You can safely close this tab.</span>
      </div>
    </Card>
  );
}

function buildWaMeUrl(displayPhoneNumber?: string): string | null {
  const digits = (displayPhoneNumber ?? '').replace(/\D+/g, '');

  return digits ? `https://wa.me/${digits}` : null;
}

type InactiveReason = 'expired' | 'used' | 'invalid';

function InactiveLinkCard({ reason }: { reason: InactiveReason }) {
  const copy = reasonCopy(reason);

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-warning-base/10 text-warning-base flex size-12 items-center justify-center rounded-full">
          <RiTimeLine className="size-6" />
        </div>
        <h1 className="text-text-strong text-paragraph-md font-semibold">{copy.title}</h1>
        <p className="text-text-soft text-paragraph-xs leading-5">{copy.description}</p>
      </div>
    </Card>
  );
}

function reasonCopy(reason: InactiveReason): { title: string; description: string } {
  switch (reason) {
    case 'expired':
      return {
        title: 'This signup link has expired',
        description:
          'Signup links are valid for 30 minutes. Re-run `npx novu connect` in your terminal to get a fresh link.',
      };
    case 'used':
      return {
        title: 'This signup link has already been used',
        description:
          'For security, each link works only once. Re-run `npx novu connect` in your terminal if you need to reconnect WhatsApp.',
      };
    case 'invalid':
      return {
        title: 'This signup link is no longer valid',
        description: 'The link may be broken or incomplete. Re-run `npx novu connect` in your terminal to continue.',
      };
    default: {
      const exhaustive: never = reason;

      throw new Error(`Unhandled inactive reason: ${exhaustive}`);
    }
  }
}

function LoadingCard() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-6">
        <div
          className="border-stroke-soft border-t-text-strong size-7 animate-spin rounded-full border-2"
          aria-label="Loading"
        />
        <p className="text-text-soft text-paragraph-xs">Checking your signup link…</p>
      </div>
    </Card>
  );
}
