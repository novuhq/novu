import {
  AgentRuntimeProviderIdEnum,
  CLAUDE_BUILTIN_TOOLS,
  DirectionEnum,
  EnvironmentTypeEnum,
  IntegrationKindEnum,
  PermissionsEnum,
} from '@novu/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowRightSLine, RiRobot2Line } from 'react-icons/ri';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AGENTS_LIST_QUERY_KEY,
  type AgentResponse,
  type CreateAgentBody,
  createAgent,
  deleteAgent,
  getAgentsListQueryKey,
  listAgents,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { deleteIntegration } from '@/api/integrations';
import { AgentsEmptyTeaser } from '@/components/agents/agents-empty-teaser';
import { AgentsProductionEmptyState } from '@/components/agents/agents-production-empty-state';
import { AgentsTable } from '@/components/agents/agents-table';
import { CreateAgentDialog, CreateAgentForm } from '@/components/agents/create-agent-dialog';
import { DeleteAgentDialog } from '@/components/agents/delete-agent-dialog';
import { ListNoResults } from '@/components/list-no-results';
import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { PermissionButton } from '@/components/primitives/permission-button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useCurrentApp } from '@/hooks/use-current-app';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTelemetry } from '@/hooks/use-telemetry';
import { APP_IDS } from '@/utils/apps';
import { AGENT_DETAILS_DEFAULT_TAB, buildRoute } from '@/utils/routes';
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
  const isDispatchApp = currentApp === APP_IDS.DISPATCH;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [after, setAfter] = useState<string | undefined>();
  const [before, setBefore] = useState<string | undefined>();
  const [limit, setLimit] = useState(12);
  const [createOpen, setCreateOpen] = useState(false);
  const [initialCreateValues, setInitialCreateValues] = useState<{ name?: string; description?: string }>({});
  const [agentToDelete, setAgentToDelete] = useState<AgentResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Allow external links (e.g. dispatch dashboard) to open the create dialog with prefilled values
  // via `?create=1&name=...&description=...`. Consume the params once and strip them from the URL.
  useEffect(() => {
    if (searchParams.get('create') !== '1') return;

    const nextName = searchParams.get('name') ?? undefined;
    const nextDescription = searchParams.get('description') ?? undefined;

    setInitialCreateValues({ name: nextName, description: nextDescription });
    setCreateOpen(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('create');
    nextParams.delete('name');
    nextParams.delete('description');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCreateOpenChange = useCallback((next: boolean) => {
    setCreateOpen(next);

    if (!next) {
      setInitialCreateValues({});
    }
  }, []);

  const memoizedInitialName = useMemo(() => initialCreateValues.name, [initialCreateValues.name]);
  const memoizedInitialDescription = useMemo(() => initialCreateValues.description, [initialCreateValues.description]);

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

  const createMutation = useMutation({
    mutationFn: (body: CreateAgentBody) =>
      createAgent(requireEnvironment(currentEnvironment, 'No environment selected'), body),
    onSuccess: async (createdAgent) => {
      showSuccessToast('Agent created', 'Your agent is ready to use.');

      track(
        isDispatchApp
          ? TelemetryEvent.DISPATCH_AGENT_CREATED_FROM_DASHBOARD
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

      navigate(agentDetailsPath);
      queryClient.invalidateQueries({ queryKey: [AGENTS_LIST_QUERY_KEY] });
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not create agent.';

      showErrorToast(message, 'Create failed');
    },
  });

  const { mutateAsync: createIntegration, isPending: isCreatingIntegration } = useCreateIntegration();

  const deleteMutation = useMutation({
    mutationFn: (identifier: string) =>
      deleteAgent(requireEnvironment(currentEnvironment, 'No environment selected'), identifier),
    onSuccess: async (_, identifier) => {
      setAgentToDelete(null);
      showSuccessToast('Agent deleted', 'The agent was removed.');

      track(
        isDispatchApp
          ? TelemetryEvent.DISPATCH_AGENT_DELETED_FROM_DASHBOARD
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

  const handleCreateSubmit = useCallback(
    async ({
      name,
      identifier,
      instructions,
      apiKey,
      externalAgentId,
      externalEnvironmentId,
      runtime,
      isExistingMode,
    }: CreateAgentForm) => {
      if (runtime === 'scratch') {
        const request: CreateAgentBody = {
          name,
          identifier,
          description: instructions,
        };

        await createMutation.mutateAsync(request);
      } else if (runtime === 'claude') {
        const request: CreateAgentBody = {
          name,
          identifier,
        };

        let integrationId: string;

        try {
          const { data: integration } = await createIntegration({
            active: true,
            kind: IntegrationKindEnum.AGENT,
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            credentials: { apiKey },
            name,
            identifier,
          });

          integrationId = integration._id;
        } catch (err) {
          const message = err instanceof NovuApiError ? err.message : 'Could not create integration.';

          showErrorToast(message, 'Create failed');

          return;
        }

        if (isExistingMode) {
          request.runtime = 'managed';
          request.managedRuntime = {
            integrationId,
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            externalAgentId,
            externalEnvironmentId,
          };
        } else {
          request.runtime = 'managed';
          request.managedRuntime = {
            integrationId,
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            model: 'claude-opus-4-5',
            systemPrompt: instructions || undefined,
            tools: CLAUDE_BUILTIN_TOOLS.map((tool) => tool.type),
          };
        }

        const environment = requireEnvironment(currentEnvironment, 'No environment selected');

        createMutation.mutate(request, {
          onError: async () => {
            try {
              await deleteIntegration({ id: integrationId, environment });
            } catch {
              // Best-effort cleanup; the global onError toast already informed the user.
            }
          },
        });
      }
    },
    [createMutation, createIntegration, currentEnvironment]
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
          cta={
            <PermissionButton
              permission={PermissionsEnum.AGENT_WRITE}
              size="xs"
              variant="secondary"
              mode="gradient"
              trailingIcon={RiArrowRightSLine}
              onClick={() => setCreateOpen(true)}
            >
              Create agent
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
                <a
                  href="https://docs.novu.co/platform/agents"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline"
                >
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
        isSubmitting={createMutation.isPending || isCreatingIntegration}
        initialName={memoizedInitialName}
        initialInstructions={memoizedInitialDescription}
      />

      <DeleteAgentDialog
        open={Boolean(agentToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setAgentToDelete(null);
          }
        }}
        onConfirm={() => {
          if (agentToDelete) {
            deleteMutation.mutate(agentToDelete.identifier);
          }
        }}
        agentName={agentToDelete?.name ?? ''}
        agentIdentifier={agentToDelete?.identifier ?? ''}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
