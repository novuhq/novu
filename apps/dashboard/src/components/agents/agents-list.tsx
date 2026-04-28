import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowRightSLine, RiRobot2Line } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { AgentsEmptyTeaser } from '@/components/agents/agents-empty-teaser';
import { AgentsTable } from '@/components/agents/agents-table';
import { CreateAgentDialog } from '@/components/agents/create-agent-dialog';
import { DeleteAgentDialog } from '@/components/agents/delete-agent-dialog';
import { ListNoResults } from '@/components/list-no-results';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { PermissionButton } from '@/components/primitives/permission-button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTelemetry } from '@/hooks/use-telemetry';
import { AGENT_DETAILS_DEFAULT_TAB, buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

const PAGE_SIZE_OPTIONS = [10, 12, 20, 50];

export function AgentsList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const track = useTelemetry();
  const canReadAgents = has({ permission: PermissionsEnum.AGENT_READ });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [after, setAfter] = useState<string | undefined>();
  const [before, setBefore] = useState<string | undefined>();
  const [limit, setLimit] = useState(12);
  const [createOpen, setCreateOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AgentResponse | null>(null);

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
      await queryClient.invalidateQueries({ queryKey: [AGENTS_LIST_QUERY_KEY] });
      showSuccessToast('Agent created', 'Your agent is ready to use.');
      setCreateOpen(false);

      track(TelemetryEvent.AGENT_CREATED_FROM_DASHBOARD, {
        agentIdentifier: createdAgent.identifier,
        active: createdAgent.active,
      });

      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const agentDetailsPath = `${buildRoute(ROUTES.AGENT_DETAILS_TAB, {
        environmentSlug: environment.slug ?? '',
        agentIdentifier: encodeURIComponent(createdAgent.identifier),
        agentTab: AGENT_DETAILS_DEFAULT_TAB,
      })}${location.search}`;

      navigate(agentDetailsPath);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not create agent.';

      showErrorToast(message, 'Create failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (identifier: string) =>
      deleteAgent(requireEnvironment(currentEnvironment, 'No environment selected'), identifier),
    onSuccess: async (_, identifier) => {
      setAgentToDelete(null);
      showSuccessToast('Agent deleted', 'The agent was removed.');

      track(TelemetryEvent.AGENT_DELETED_FROM_DASHBOARD, { agentIdentifier: identifier });

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
    async (body: CreateAgentBody) => {
      await createMutation.mutateAsync(body);
    },
    [createMutation]
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

  if (showEmptyBlank) {
    return (
      <>
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
        <CreateAgentDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreateSubmit}
          isSubmitting={createMutation.isPending}
        />
      </>
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

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
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
    </div>
  );
}
