import { providers as novuProviders } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { RiAddLine, RiArrowRightLine, RiArrowRightSLine } from 'react-icons/ri';
import { Link, useLocation } from 'react-router-dom';
import {
  type AgentIntegrationLink,
  type AgentResponse,
  getAgentIntegrationsQueryKey,
  listAgentIntegrations,
} from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Skeleton } from '@/components/primitives/skeleton';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

type ConnectedProvidersSectionProps = {
  agent: AgentResponse;
};

function ProviderCard({ link }: { link: AgentIntegrationLink }) {
  const providerMeta = novuProviders.find((p) => p.id === link.integration.providerId);
  const displayName = providerMeta?.displayName ?? link.integration.name;

  return (
    <div className="flex min-w-[150px] max-w-[160px] flex-1 flex-col gap-1.5">
      <div
        className="border-stroke-soft/50 flex min-h-[80px] items-center justify-center rounded-lg border-[0.5px] px-6 py-4"
        style={{
          backgroundImage:
            'linear-gradient(22deg, rgba(200,200,200,0) 51%, rgba(200,200,200,0.1) 88%), linear-gradient(90deg, rgba(251,251,251,0.1) 0%, rgba(251,251,251,0.1) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
        }}
      >
        <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-[0px_0.75px_1px_0.5px_rgba(41,41,41,0.04),0px_1.5px_1.5px_-0.75px_rgba(41,41,41,0.02),0px_3px_3px_-1.5px_rgba(41,41,41,0.04),0px_6px_6px_-3px_rgba(41,41,41,0.04),0px_12px_12px_-6px_rgba(41,41,41,0.04),0px_24px_24px_-12px_rgba(41,41,41,0.04),0px_0px_0px_8px_rgba(41,41,41,0.04)]">
          <ProviderIcon providerId={link.integration.providerId} providerDisplayName={displayName} className="size-5" />
        </div>
      </div>
      <span className="text-text-strong text-label-xs font-medium leading-4">{displayName}</span>
    </div>
  );
}

function AddProviderCard({ to }: { to: string }) {
  return (
    <Link to={to} className="flex min-w-[150px] max-w-[160px] flex-1 flex-col gap-1.5">
      <div
        className="border-stroke-soft/50 flex min-h-[80px] items-center justify-center rounded-lg border-[0.5px] px-6 py-4"
        style={{
          backgroundImage:
            'linear-gradient(22deg, rgba(200,200,200,0) 51%, rgba(200,200,200,0.1) 88%), linear-gradient(90deg, rgba(251,251,251,0.1) 0%, rgba(251,251,251,0.1) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
        }}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-white">
          <RiAddLine className="text-text-sub size-4" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">Add new provider</span>
        <RiArrowRightSLine className="text-text-sub size-4 shrink-0" />
      </div>
    </Link>
  );
}

function ProviderCardSkeleton() {
  return (
    <div className="flex min-w-[150px] max-w-[160px] flex-1 flex-col gap-1.5">
      <Skeleton className="h-[80px] w-full rounded-lg" />
      <Skeleton className="h-4 w-16 rounded" />
    </div>
  );
}

export function ConnectedProvidersSection({ agent }: ConnectedProvidersSectionProps) {
  const { currentEnvironment } = useEnvironment();
  const location = useLocation();

  const integrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: agent.identifier,
        limit: 100,
      }),
    enabled: Boolean(currentEnvironment && agent.identifier),
  });

  const integrationsTabPath = `${buildRoute(ROUTES.AGENT_DETAILS_TAB, {
    environmentSlug: currentEnvironment?.slug ?? '',
    agentIdentifier: encodeURIComponent(agent.identifier),
    agentTab: 'integrations',
  })}${location.search}`;

  const links = integrationsQuery.data?.data ?? [];
  const isLoading = integrationsQuery.isLoading;

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          Connected providers
        </span>
        <Link
          to={integrationsTabPath}
          className="text-text-sub hover:text-text-strong flex items-center gap-0.5 rounded-lg p-1.5 text-label-xs font-medium transition-colors"
        >
          Manage integrations
          <RiArrowRightLine className="size-4" />
        </Link>
      </div>

      <div className="bg-bg-white overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap gap-4 p-3">
          {isLoading ? (
            <>
              <ProviderCardSkeleton />
              <ProviderCardSkeleton />
            </>
          ) : (
            <>
              {links.map((link) => (
                <ProviderCard key={link._id} link={link} />
              ))}
              <AddProviderCard to={integrationsTabPath} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
