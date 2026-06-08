import { DirectionEnum, EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowRightSLine, RiRobot2Line } from 'react-icons/ri';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AGENTS_LIST_QUERY_KEY,
  type AgentResponse,
  deleteAgent,
  getAgentsListQueryKey,
  listAgents,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { AgentsEmptyTeaser } from '@/components/agents/agents-empty-teaser';
import { AgentsProductionEmptyState } from '@/components/agents/agents-production-empty-state';
import { AgentsTable } from '@/components/agents/agents-table';
import { CreateAgentDialog, CreateAgentForm } from '@/components/agents/create-agent-dialog';
import { findAgentTemplateById } from '@/components/agents/create-agent-fields';
import { DeleteAgentDialog } from '@/components/agents/delete-agent-dialog';
import { ListNoResults } from '@/components/list-no-results';
import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { PermissionButton } from '@/components/primitives/permission-button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useAgentTemplates } from '@/hooks/use-agent-templates';
import { useCreateAgentMutation } from '@/hooks/use-create-agent-mutation';
import { useCurrentApp } from '@/hooks/use-current-app';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTelemetry } from '@/hooks/use-telemetry';
import { AGENTS_DOCS_PROVIDERS_URL } from '@/utils/agent-docs';
import {
  AGENT_TEMPLATE_ID_PARAM,
  clearPersistedAgentTemplateId,
  readActiveAgentTemplateId,
} from '@/utils/agent-template-identity';
import { APP_IDS } from '@/utils/apps';
import { withAppId } from '@/utils/onboarding-redirect';
import { AGENT_DETAILS_DEFAULT_TAB, buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

const PAGE_SIZE_OPTIONS = [10, 12, 20, 50];

export function AgentsList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentEnvironment, readOnly } = useEnvironment();
  const has = useHasPermission();
  const track = useTelemetry();
  const agentRoutes = useAgentRoutes();
  const canReadAgents = has({ permission: PermissionsEnum.AGENT_READ });
  const currentApp = useCurrentApp();
  const isConnectApp = currentApp === APP_IDS.CONNECT;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [after, setAfter] = useState<string | undefined>();
  const [before, setBefore] = useState<string | undefined>();
  const [limit, setLimit] = useState(12);
  const [createOpen, setCreateOpen] = useState(false);
  const [initialCreateValues, setInitialCreateValues] = useState<{
    name?: string;
    description?: string;
    prompt?: string;
  }>({});
  const [agentToDelete, setAgentToDelete] = useState<AgentResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const { templates: agentTemplates } = useAgentTemplates();

  // Allow external links (e.g. connect dashboard) to open the create dialog with prefilled values
  // via `?create=1&name=...&description=...`, or a Sanity-backed template via `?agentTemplateId=...`
  // (also picked up from sessionStorage when it survived the auth flow). Consume once and strip the
  // params from the URL.
  useEffect(() => {
    const hasCreate = searchParams.get('create') === '1';
    const templateId = readActiveAgentTemplateId(searchParams.get(AGENT_TEMPLATE_ID_PARAM));

    if (!hasCreate && !templateId) return;

    let nextName = searchParams.get('name') ?? undefined;
    let nextDescription = searchParams.get('description') ?? undefined;
    let nextPrompt: string | undefined;

    if (templateId) {
      const template = findAgentTemplateById(agentTemplates, templateId);
      // Templates may still be loading — wait for the match before consuming the id.
      if (!template) return;

      nextName = nextName ?? template.name;
      nextDescription = nextDescription ?? template.instructions;
      nextPrompt = template.instructions;
      clearPersistedAgentTemplateId();
    }

    setInitialCreateValues({ name: nextName, description: nextDescription, prompt: nextPrompt });
    setCreateOpen(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('create');
    nextParams.delete('name');
    nextParams.delete('description');
    nextParams.delete(AGENT_TEMPLATE_ID_PARAM);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, agentTemplates]);

  const handleCreateOpenChange = useCallback((next: boolean) => {
    setCreateOpen(next);

    if (!next) {
      setInitialCreateValues({});
    }
  }, []);

  const memoizedInitialName = useMemo(() => initialCreateValues.name, [initialCreateValues.name]);
  const memoizedInitialDescription = useMemo(() => initialCreateValues.description, [initialCreateValues.description]);
  const memoizedInitialPrompt = useMemo(() => initialCreateValues.prompt, [initialCreateValues.prompt]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch((prev) => {
        const next = search.trim();

        if (prev !== next) {
          setAfter(undefined);
          setBefore(undefined);
        }

        return next;
      });
    }, 400);

    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useQuery({
    queryKey: getAgentsListQueryKey(currentEnvironment?._id, {
      after,
      before,
      limit,
      identifier: debouncedSearch,
    }),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit,
        after,
        before,
        orderBy: 'updatedAt',
        orderDirection: DirectionEnum.DESC,
        identifier: debouncedSearch || undefined,
      }),
    enabled: Boolean(currentEnvironment) && canReadAgents,
    placeholderData: keepPreviousData,
  });

  const { submit: submitCreateAgent, isPending: isCreatingAgent } = useCreateAgentMutation();

  const deleteMutation = useMutation({
    mutationFn: ({ identifier, deleteFromProvider }: { identifier: string; deleteFromProvider?: boolean }) =>
      deleteAgent(requireEnvironment(currentEnvironment, 'No environment selected'), identifier, {
        deleteFromProvider,
      }),
    onSuccess: async (_, { identifier }) => {
      setAgentToDelete(null);
      showSuccessToast('Agent deleted', 'The agent was removed.');

      track(
        isConnectApp
          ? TelemetryEvent.CONNECT_AGENT_DELETED_FROM_DASHBOARD
          : TelemetryEvent.AGENT_DELETED_FROM_DASHBOARD,
        { agentIdentifier: identifier }
      );

      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const listKey = getAgentsListQueryKey(environment._id, {
        after,
        before,
        limit,
        identifier: debouncedSearch,
      });

      await queryClient.invalidateQueries({ queryKey: [AGENTS_LIST_QUERY_KEY] });

      const refreshed = await queryClient.fetchQuery({
        queryKey: listKey,
        queryFn: () =>
          listAgents({
            environment,
            limit,
            after,
            before,
            orderBy: 'updatedAt',
            orderDirection: DirectionEnum.DESC,
            identifier: debouncedSearch || undefined,
          }),
      });

      if (refreshed.data.length === 0 && refreshed.previous) {
        setBefore(refreshed.previous);
        setAfter(undefined);
      }
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not delete agent.';

      showErrorToast(message, 'Delete failed');
    },
  });

  const handleNextPage = useCallback(() => {
    const next = listQuery.data?.next;

    if (!next) {
      return;
    }

    setAfter(next);
    setBefore(undefined);
  }, [listQuery.data?.next]);

  const handlePreviousPage = useCallback(() => {
    const previous = listQuery.data?.previous;

    if (!previous) {
      return;
    }

    setBefore(previous);
    setAfter(undefined);
  }, [listQuery.data?.previous]);

  const handlePageSizeChange = useCallback((nextLimit: number) => {
    setLimit(nextLimit);
    setAfter(undefined);
    setBefore(undefined);
  }, []);

  const goToFirstAgentSetup = useCallback(() => {
    navigate(withAppId(ROUTES.AGENTS_SETUP, currentApp));
  }, [currentApp, navigate]);

  const handleCreateSubmit = useCallback(
    async (form: CreateAgentForm) => {
      await submitCreateAgent(form, {
        onSuccess: (createdAgent) => {
          showSuccessToast('Agent created', 'Your agent is ready to use.');

          track(
            isConnectApp
              ? TelemetryEvent.CONNECT_AGENT_CREATED_FROM_DASHBOARD
              : TelemetryEvent.AGENT_CREATED_FROM_DASHBOARD,
            {
              agentIdentifier: createdAgent.identifier,
              active: createdAgent.active,
            }
          );

          const environment = requireEnvironment(currentEnvironment, 'No environment selected');
          const agentDetailsPath = `${buildRoute(agentRoutes.detailsTab, {
            environmentSlug: environment.slug ?? '',
            agentIdentifier: encodeURIComponent(createdAgent.identifier),
            agentTab: AGENT_DETAILS_DEFAULT_TAB,
          })}${location.search}`;

          setCreateOpen(false);
          navigate(agentDetailsPath);
        },
        onError: (err) => {
          const message = err instanceof NovuApiError ? err.message : 'Could not create agent.';
          showErrorToast(message, 'Create failed');
        },
      });
    },
    [submitCreateAgent, track, isConnectApp, currentEnvironment, agentRoutes.detailsTab, location.search, navigate]
  );

  if (!canReadAgents) {
    return (
      <div className="text-text-soft text-label-sm border-stroke-soft rounded-lg border border-dashed p-8 text-center">
        You don&apos;t have permission to view agents for this organization.
      </div>
    );
  }

  const data = listQuery.data;
  const isLoading = listQuery.isPending;
  const agents: AgentResponse[] = data?.data ?? [];
  const hasFilters = debouncedSearch.length > 0;
  const showEmptyBlank = !listQuery.isError && !isLoading && !hasFilters && agents.length === 0;
  const showNoResults = !listQuery.isError && !isLoading && hasFilters && agents.length === 0;

  const isProductionEnv =
    Boolean(currentEnvironment) && (readOnly || currentEnvironment?.type !== EnvironmentTypeEnum.DEV);

  const renderContent = () => {
    if (showEmptyBlank) {
      if (isProductionEnv) {
        return <AgentsProductionEmptyState />;
      }

      return (
        <AgentsEmptyTeaser
          isConnectApp={isConnectApp}
          cta={
            <PermissionButton
              permission={PermissionsEnum.AGENT_WRITE}
              size="xs"
              variant="secondary"
              mode="gradient"
              trailingIcon={RiArrowRightSLine}
              onClick={goToFirstAgentSetup}
            >
              Setup an agent
            </PermissionButton>
          }
        />
      );
    }

    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FacetedFormFilter
            type="text"
            size="small"
            title="Search"
            value={search}
            onChange={setSearch}
            placeholder="Search by identifier..."
          />
          {isProductionEnv ? (
            <Tooltip>
              <TooltipTrigger className="cursor-not-allowed">
                <Button size="xs" variant="primary" className="gap-1.5" leadingIcon={RiRobot2Line} disabled>
                  Add Agent
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-60">
                {'Add agents in your development environment. '}
                <a href={AGENTS_DOCS_PROVIDERS_URL} target="_blank" rel="noreferrer noopener" className="underline">
                  Learn More ↗
                </a>
              </TooltipContent>
            </Tooltip>
          ) : (
            <PermissionButton
              permission={PermissionsEnum.AGENT_WRITE}
              size="xs"
              variant="primary"
              mode="gradient"
              className="gap-1.5"
              leadingIcon={RiRobot2Line}
              onClick={() => setCreateOpen(true)}
            >
              Add Agent
            </PermissionButton>
          )}
        </div>

        {listQuery.isError ? (
          <div className="text-error-base text-label-sm">Could not load agents. Try again later.</div>
        ) : null}

        {showNoResults ? (
          <ListNoResults
            title="No agents found"
            description="Try a different identifier search."
            onClearFilters={() => setSearch('')}
          />
        ) : null}

        {!listQuery.isError && !showNoResults ? (
          <AgentsTable
            agents={agents}
            isLoading={isLoading}
            onRequestDelete={setAgentToDelete}
            paginationProps={{
              pageSize: limit,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              currentItemsCount: agents.length,
              onPreviousPage: handlePreviousPage,
              onNextPage: handleNextPage,
              onPageSizeChange: handlePageSizeChange,
              hasPreviousPage: Boolean(data?.previous),
              hasNextPage: Boolean(data?.next),
              totalCount: data?.totalCount,
              totalCountCapped: data?.totalCountCapped,
            }}
          />
        ) : null}
      </div>
    );
  };

  return (
    <>
      {renderContent()}

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        onSubmit={handleCreateSubmit}
        isSubmitting={isCreatingAgent}
        initialName={memoizedInitialName}
        initialInstructions={memoizedInitialDescription}
        initialPrompt={memoizedInitialPrompt}
      />

      <DeleteAgentDialog
        open={Boolean(agentToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setAgentToDelete(null);
          }
        }}
        onConfirm={({ deleteFromProvider }) => {
          if (agentToDelete) {
            deleteMutation.mutate({ identifier: agentToDelete.identifier, deleteFromProvider });
          }
        }}
        agentName={agentToDelete?.name ?? ''}
        agentIdentifier={agentToDelete?.identifier ?? ''}
        isDeleting={deleteMutation.isPending}
        isManagedRuntime={agentToDelete?.runtime === 'managed'}
      />
    </>
  );
}
