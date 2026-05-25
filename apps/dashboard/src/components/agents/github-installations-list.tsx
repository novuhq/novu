import { useMutation, useQuery } from '@tanstack/react-query';
import { RiAddLine, RiArrowRightUpLine, RiErrorWarningLine } from 'react-icons/ri';
import {
  generateMcpOAuthUrl,
  getMcpInstallationsQueryKey,
  listMcpInstallations,
  type McpInstallation,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { Button } from '@/components/primitives/button';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';

type GithubInstallationsListProps = {
  agentIdentifier: string;
  /** Catalog mcpId — always `github` today, but typed for future App+Install integrations. */
  mcpId: string;
};

/**
 * Render the live list of GitHub-App installations the current
 * subscriber's stored token can act on, with deep links to manage repos
 * on github.com and a button to install on additional accounts.
 *
 * Self-contained: renders nothing when the connection is not `connected`,
 * because the only thing we could show without a token is "you're not
 * connected yet", and that copy lives in the parent row's enable/auth UX.
 *
 * Triggers re-fetch on subscriber/environment change. Polling is NOT
 * automatic — users add accounts by clicking the button, which generates
 * a fresh OAuth URL and pops it in a new tab; we'll re-render once the
 * callback fires and the query is invalidated.
 */
export function GithubInstallationsList({ agentIdentifier, mcpId }: GithubInstallationsListProps) {
  const { currentEnvironment } = useEnvironment();
  const { subscriberId, isReady } = useConnectSubscriber();

  const installationsQuery = useQuery({
    queryKey: getMcpInstallationsQueryKey(currentEnvironment?._id, agentIdentifier, mcpId, subscriberId),
    queryFn: ({ signal }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return listMcpInstallations(currentEnvironment, agentIdentifier, mcpId, subscriberId, signal);
    },
    enabled: Boolean(currentEnvironment && agentIdentifier && isReady && subscriberId),
    // Stale time matches the backend SSRF cache rough lifecycle — the
    // upstream call is cheap (single REST), but a tighter window would
    // re-fetch on every sheet open with no UX benefit.
    staleTime: 60_000,
  });

  const connectMutation = useMutation({
    mutationFn: () => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return generateMcpOAuthUrl(currentEnvironment, agentIdentifier, mcpId, subscriberId);
    },
    onSuccess: ({ authorizeUrl }) => {
      // Pop the install URL in a new tab; the callback will redirect back
      // to the dashboard's OAuth-result page, which invalidates the query.
      window.open(authorizeUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not start the install flow.';
      showErrorToast(message, 'Install failed');
    },
  });

  if (!isReady) {
    return null;
  }

  if (installationsQuery.isLoading) {
    return <div className="text-text-soft text-label-xs px-3 py-2">Loading installations…</div>;
  }

  if (installationsQuery.isError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-label-xs text-text-soft">
        <RiErrorWarningLine className="size-4 shrink-0" aria-hidden />
        <span>Could not load GitHub installations. Try again later.</span>
      </div>
    );
  }

  const data = installationsQuery.data;
  if (!data) {
    return null;
  }

  // Pending OAuth / not-yet-connected statuses are owned by the parent
  // row's enable + authorize CTA. Render nothing here so we don't
  // duplicate UX copy across two surfaces.
  if (data.connectionStatus !== 'connected') {
    return null;
  }

  return (
    <div className="flex flex-col">
      {data.data.length === 0 ? (
        <div className="text-text-soft text-label-xs px-3 py-2">
          No installations on your account yet. Install the GitHub App to grant repo access.
        </div>
      ) : (
        <ul className="flex flex-col">
          {data.data.map((installation) => (
            <InstallationRow key={installation.id} installation={installation} />
          ))}
        </ul>
      )}

      <div className="px-3 pb-2">
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          size="xs"
          trailingIcon={RiAddLine}
          isLoading={connectMutation.isPending}
          disabled={connectMutation.isPending}
          onClick={() => connectMutation.mutate()}
          className="border-stroke-soft w-full justify-center"
        >
          Install on another account
        </Button>
      </div>
    </div>
  );
}

function InstallationRow({ installation }: { installation: McpInstallation }) {
  const { account, repositorySelection, manageUrl } = installation;
  const repoSummary = repositorySelection === 'all' ? 'All repositories' : 'Selected repositories';

  return (
    <li className="flex items-center gap-3 px-3 py-2 not-last:border-b border-stroke-soft/60">
      {account.avatarUrl ? (
        <img
          src={account.avatarUrl}
          alt=""
          className="size-5 rounded-full shrink-0"
          referrerPolicy="no-referrer"
          aria-hidden
        />
      ) : (
        <span className="size-5 rounded-full bg-bg-weak shrink-0" aria-hidden />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-text-strong text-label-xs font-medium truncate">{account.login}</span>
        <span className="text-text-soft text-paragraph-xs leading-3 truncate">{repoSummary}</span>
      </div>
      <a
        href={manageUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="text-text-sub hover:text-text-strong inline-flex shrink-0 items-center gap-0.5 text-label-xs font-medium transition-colors"
        aria-label={`Manage installation for ${account.login}`}
      >
        Manage
        <RiArrowRightUpLine className="size-3.5" />
      </a>
    </li>
  );
}
