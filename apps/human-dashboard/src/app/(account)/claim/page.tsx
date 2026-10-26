import { currentUser, type User } from '@clerk/nextjs/server';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DASHBOARD_HOME, DOCS_URL } from '@/components/dashboard/nav';
import { Stage, StageCard } from '@/components/site/stage';
import { buttonClassName } from '@/components/ui/button';
import { readHumanAccount } from '@/lib/human-account';
import type { HumanRegion } from '@/lib/human-accounts-api';
import { DEFAULT_AGENT_NAME, getRelayAgent } from '@/lib/human-agent-api';
import { isAccountAgentInUse } from '@/lib/human-claim';

import { ClaimForm } from './claim-form';

export const metadata: Metadata = {
  title: 'Claim your agent',
  robots: { index: false, follow: false },
  // The claim token is in the URL; keep it out of the Referer.
  referrer: 'origin',
};

/**
 * Opened from the link an agent gets once its keyless setup runs out of free messages
 * (`…/claim?token=…`, plus `&region=eu` from the EU API). Signing up comes first. An account whose
 * agent is already in use can't take another setup in, so it's told so instead of being offered the move.
 * Once the claim went through, the action sends the operator back here with `?claimed=1`.
 */
export default async function ClaimPage(props: PageProps<'/claim'>) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const region: HumanRegion = searchParams.region === 'eu' ? 'eu' : 'us';

  const user = await currentUser();
  if (!user && token) {
    const claimPath = `/claim?${new URLSearchParams({ token, ...(region === 'eu' ? { region } : {}) })}`;
    redirect(`/sign-up?${new URLSearchParams({ redirect_url: claimPath })}`);
  }

  const email = user?.primaryEmailAddress?.emailAddress;

  if (user && searchParams.claimed === '1') {
    const agentName = await loadAgentName(user);

    return (
      <Stage aside={email}>
        <StageCard
          icon={<StateMark glyph="success" />}
          title={`${agentName ?? 'Your agent'} is claimed`}
          description="Its threads and contacts moved into your account. You can close this tab."
        >
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3.5 font-mono text-[13px] leading-5 text-default">
            <p className="flex gap-2">
              <span aria-hidden="true" className="shrink-0 font-medium text-success select-none">
                ✓
              </span>
              <span className="min-w-0 wrap-anywhere">Claimed {agentName ?? 'your agent'}</span>
            </p>
            <p className="flex gap-2">
              {/* Drawn: the mono font's subset has no arrow, and the fallback's is two letters wide. */}
              <ArrowRight aria-hidden="true" className="h-5 w-[1ch] shrink-0 text-muted" strokeWidth={1.5} />
              <span className="min-w-0 wrap-anywhere">Next: npx @agentinbox/cli login, then contact invite maya</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={DASHBOARD_HOME} className={buttonClassName('secondary')}>
              Open {agentName ? `${agentName}’s` : 'the'} inbox
            </Link>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-3 text-[13px] leading-4.5 font-medium text-secondary transition-colors duration-150 hover:bg-raised hover:text-foreground motion-reduce:transition-none"
            >
              <ArrowUpRight aria-hidden="true" className="size-3.5 text-foreground" strokeWidth={1.33} />
              Read the quickstart
            </a>
          </div>
        </StageCard>
      </Stage>
    );
  }

  if (!token) {
    return (
      <Stage aside={email}>
        <StageCard
          icon={<StateMark glyph="error" />}
          title="This page needs a claim link"
          description="Open the link your agent sent you. It moves the agent you set up without an account into yours."
        />
      </Stage>
    );
  }

  if (user && (await isAccountAgentInUse(user))) {
    return (
      <Stage aside={email}>
        <StageCard
          icon={<StateMark glyph="error" />}
          title="This agent can’t be claimed here"
          description="Your Agent Inbox account’s agent is already in use, with channels or contacts of its own, so this one can’t be moved into it. Nothing was changed: your account keeps what it has, and the agent set up without an account stays where it is."
        >
          <div>
            <Link href={DASHBOARD_HOME} className={buttonClassName('secondary')}>
              Open your inbox
            </Link>
          </div>
        </StageCard>
      </Stage>
    );
  }

  return (
    <Stage aside={email}>
      <StageCard
        title={
          <>
            Claim <em className="font-display text-accent">your agent’s</em> inbox
          </>
        }
        description="Its threads and contacts come with it, into your Agent Inbox account."
      >
        <ClaimForm token={token} region={region} />
      </StageCard>
    </Stage>
  );
}

/** The Figma illustrations `Illustration/state-success` and `Illustration/state-error`, exported as they are. */
function StateMark({ glyph }: { glyph: 'success' | 'error' }) {
  return <img src={`/illustrations/state-${glyph}.svg`} alt="" width={72} height={72} className="size-18" />;
}

/** The claimed agent's own name, for the title. `null` when it has none yet or can't be read just now. */
async function loadAgentName(user: User): Promise<string | null> {
  const account = readHumanAccount(user);
  if (!account) {
    return null;
  }

  try {
    const name = (await getRelayAgent(account))?.name?.trim();

    return name && name !== DEFAULT_AGENT_NAME ? name : null;
  } catch (error) {
    console.error('Failed to load the claimed agent for the claim page', error);

    return null;
  }
}
