import { FeatureFlagsKeysEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RiCheckLine, RiTerminalBoxLine } from 'react-icons/ri';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { WhatsAppEmbeddedSignupButton } from '@/components/agents/whatsapp-embedded-signup-button';
import { isWhatsAppEmbeddedSignupConfigured } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

/**
 * Minimal signup page opened by `npx novu connect` for the WhatsApp flow.
 * The CLI creates the integration, opens this page, and polls the API until
 * Embedded Signup completes — so this page stays intentionally small: one
 * "Log in with Facebook" button and a "return to your terminal" success state.
 */
export function AgentWhatsAppSignupPage() {
  const { environmentSlug = '', agentIdentifier = '' } = useParams<{
    environmentSlug: string;
    agentIdentifier: string;
  }>();
  const [searchParams] = useSearchParams();
  const integrationIdentifier = searchParams.get('integration') ?? '';
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEmbeddedSignupFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED, false);
  const isEmbeddedSignupAvailable = isEmbeddedSignupFlagEnabled && isWhatsAppEmbeddedSignupConfigured();

  const integrationsTabUrl = buildRoute(ROUTES.AGENT_DETAILS_TAB, {
    environmentSlug,
    agentIdentifier,
    agentTab: 'integrations',
  });

  if (!agentIdentifier || !integrationIdentifier || !isEmbeddedSignupAvailable) {
    return (
      <PageShell>
        <Card>
          <div className="flex flex-col gap-2">
            <h1 className="text-text-strong text-paragraph-md font-semibold">Continue WhatsApp setup in Novu</h1>
            <p className="text-text-soft text-paragraph-xs leading-5">
              Embedded Signup is not available here. Open the full integration setup to connect WhatsApp Business to
              your agent.
            </p>
          </div>
          <Link
            to={integrationsTabUrl}
            className="bg-text-strong text-static-white hover:bg-text-strong/90 mt-5 flex h-10 w-full items-center justify-center rounded-10 px-3.5 text-label-sm transition"
          >
            Open integration setup
          </Link>
        </Card>
      </PageShell>
    );
  }

  if (isComplete) {
    return (
      <PageShell>
        <Card>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-success-base/10 text-success-base flex size-12 items-center justify-center rounded-full">
              <RiCheckLine className="size-6" />
            </div>
            <h1 className="text-text-strong text-paragraph-md font-semibold">WhatsApp signup complete</h1>
            <p className="text-text-soft text-paragraph-xs leading-5">
              Your WhatsApp Business account is connected. Return to your terminal — the CLI picks up from here and
              walks you through sending a test message.
            </p>
          </div>
          <div className="border-stroke-soft bg-bg-weak text-text-sub mt-5 flex items-center justify-center gap-2 rounded-md border p-2.5">
            <RiTerminalBoxLine className="size-4 shrink-0" />
            <span className="text-label-xs font-medium">You can safely close this tab.</span>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card>
        <div className="flex flex-col gap-2">
          <p className="text-text-soft text-label-xs uppercase tracking-wide">Connect WhatsApp Business</p>
          <h1 className="text-text-strong text-paragraph-md font-medium leading-snug">
            Log in with Facebook to finish setup
          </h1>
          <p className="text-text-soft text-paragraph-xs leading-5">
            Share your WhatsApp Business account with Novu — we save the credentials and register the webhook
            automatically. Keep your terminal open: the CLI resumes as soon as signup completes.
          </p>
        </div>

        <div className="mt-5 flex justify-center">
          <WhatsAppEmbeddedSignupButton
            agentIdentifier={agentIdentifier}
            integrationIdentifier={integrationIdentifier}
            onSuccess={() => {
              setErrorMessage(null);
              setIsComplete(true);
            }}
            onError={(message) => setErrorMessage(message)}
          />
        </div>

        {errorMessage ? (
          <p className="text-error-base text-label-xs mt-3 text-center leading-4">{errorMessage}</p>
        ) : null}

        <p className="text-text-soft text-label-xs mt-5 text-center leading-4">
          Prefer entering credentials manually?{' '}
          <Link to={integrationsTabUrl} className="text-text-sub underline">
            Open the full integration setup
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-weak flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-stroke-soft bg-bg-white shadow-regular-xs flex w-full flex-col rounded-xl border p-5',
        className
      )}
    >
      {children}
    </div>
  );
}
