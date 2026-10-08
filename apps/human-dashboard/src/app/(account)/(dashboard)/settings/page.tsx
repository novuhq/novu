import { currentUser, type User } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { getRelayAgent } from '@/lib/human-agent-api';
import { readApiKey } from '@/lib/human-api-key';

import { ApiKeyCard } from './api-key-card';
import { DeleteAccountCard } from './delete-account-card';
import { LogOutButton } from './log-out-button';
import { SettingsCard } from './settings-card';

export const metadata: Metadata = {
  title: 'Settings',
};

const SETTINGS_PATH = '/settings';

/** What the relay agent is called until the operator names it (the Agent page, NV-8966). */
const UNNAMED_AGENT_NAME = 'Human';

/** How the dashboard calls an agent that has no name of its own yet, as in the sidebar. */
const UNNAMED_AGENT_LABEL = 'Human assistant';

/** How Clerk calls the sign-in services whose name isn't just the capitalized id. */
const PROVIDER_NAMES: Record<string, string> = { github: 'GitHub', gitlab: 'GitLab', linkedin: 'LinkedIn' };

/** The operator, their API key, their plan and the way out. */
export default async function SettingsPage() {
  const [user, account] = await Promise.all([currentUser(), requireHumanAccount({ returnTo: SETTINGS_PATH })]);
  if (!user) {
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: SETTINGS_PATH })}`);
  }

  const [apiKey, agentName] = await Promise.all([loadApiKey(account), loadAgentName(account)]);
  const email = user.primaryEmailAddress?.emailAddress;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Your account';

  return (
    <>
      <PageHeader title="Settings" description="You, your API key and your plan." />
      <SettingsCard className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-sm font-medium text-foreground ring-1 ring-border-strong/60">
          {user.hasImage ? (
            <img src={user.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm leading-5.25 font-medium text-foreground">{name}</p>
          <p className="truncate text-xs leading-4 text-muted">
            {[email, describeSignInMethod(user)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <LogOutButton />
      </SettingsCard>
      <ApiKeyCard apiKey={apiKey} />
      {/* The design's `Dither` here is 434px wide at 20%. */}
      <SettingsCard className="dither-side flex flex-col gap-3 [--dither-opacity:0.2] [--dither-width:434px]">
        <h2 className="flex items-center gap-2.5 text-[13px] leading-4.5 font-medium text-foreground">
          Plan
          <Badge variant="accent">Beta</Badge>
        </h2>
        <p className="text-xs leading-4 text-secondary">Everything is free while we&apos;re in beta.</p>
      </SettingsCard>
      <DeleteAccountCard agentName={agentName} />
    </>
  );
}

/** The rest of Settings, deleting the account above all, has to stay reachable when the key can't be read. */
async function loadApiKey(account: HumanAccount): Promise<string | null> {
  try {
    return await readApiKey(account);
  } catch (error) {
    console.error('Failed to load the API key for the Settings page', error);

    return null;
  }
}

/** The agent's name is only wording here, so the page still loads when it can't be read. */
async function loadAgentName(account: HumanAccount): Promise<string> {
  try {
    const name = (await getRelayAgent(account))?.name?.trim();

    return name && name !== UNNAMED_AGENT_NAME ? name : UNNAMED_AGENT_LABEL;
  } catch (error) {
    console.error('Failed to load the relay agent for the Settings page', error);

    return UNNAMED_AGENT_LABEL;
  }
}

/** "signed in with GitHub" for a social account, otherwise how Clerk knows them. */
function describeSignInMethod(user: User): string {
  const provider = user.externalAccounts[0]?.provider.replace(/^oauth_/, '');
  if (provider) {
    return `signed in with ${PROVIDER_NAMES[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)}`;
  }

  return user.passwordEnabled ? 'signed in with a password' : 'signed in with email';
}
