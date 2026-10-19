import { CLAUDE_BUILTIN_TOOLS, type ClaudeBuiltinTool } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RiArrowRightUpLine } from 'react-icons/ri';
import {
  type AgentResponse,
  type AgentTool,
  getAgentRuntimeConfig,
  getAgentRuntimeConfigQueryKey,
  patchAgentRuntimeConfig,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

type ToolsSectionProps = {
  agent: AgentResponse;
};

const BUILTIN_TOOL_BY_TYPE: Map<string, ClaudeBuiltinTool> = new Map(
  CLAUDE_BUILTIN_TOOLS.map((tool) => [tool.type, tool])
);

function toRuntimeTool(builtin: ClaudeBuiltinTool): AgentTool {
  return {
    externalId: builtin.type,
    name: builtin.name,
    type: 'builtin',
    description: builtin.description,
  };
}

export function ToolsSection({ agent }: ToolsSectionProps) {
  const { currentEnvironment, readOnly } = useEnvironment();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      getAgentRuntimeConfig(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier),
    enabled: Boolean(currentEnvironment && agent.identifier && agent.runtime === 'managed'),
  });

  const updateTools = useMutation({
    mutationFn: (tools: AgentTool[]) =>
      patchAgentRuntimeConfig(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        tools,
      }),
    onSuccess: (config) => {
      queryClient.setQueryData(getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier), config);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not update tools.';
      showErrorToast(message, 'Update failed');
    },
  });

  const config = configQuery.data;
  const activeTools = useMemo<AgentTool[]>(() => config?.tools ?? [], [config?.tools]);
  const activeByExternalId = useMemo(() => new Map(activeTools.map((t) => [t.externalId, t])), [activeTools]);
  // Surface custom tools (e.g. provider-side) that aren't in our static builtin catalog so they remain editable.
  const customTools = useMemo(
    () => activeTools.filter((tool) => !BUILTIN_TOOL_BY_TYPE.has(tool.externalId)),
    [activeTools]
  );

  if (agent.runtime !== 'managed') {
    return null;
  }

  if (config?.capabilities && config.capabilities.tools === false) {
    return null;
  }

  const handleToggle = (builtin: ClaudeBuiltinTool, nextEnabled: boolean) => {
    if (nextEnabled) {
      const next: AgentTool[] = [...activeTools, toRuntimeTool(builtin)];
      updateTools.mutate(next);

      return;
    }

    const next = activeTools.filter((tool) => tool.externalId !== builtin.type);
    updateTools.mutate(next);
  };

  const handleCustomToggleOff = (tool: AgentTool) => {
    const next = activeTools.filter((existing) => existing.externalId !== tool.externalId);
    updateTools.mutate(next);
  };

  const isMutating = updateTools.isPending;
  const canEdit = !readOnly;
  const consoleUrl = agent.managedRuntime?.consoleUrl;

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between px-2 pt-1 pb-1.5 gap-1">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider truncate">
          Tools &amp; capabilities
        </span>
        <div className="flex items-center gap-2">
          <span className="text-text-soft text-label-xs font-normal truncate">Managed externally</span>
          <span className="text-text-soft text-label-xs">·</span>
          {consoleUrl ? (
            <a
              href={consoleUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 rounded-lg p-0 text-label-xs font-medium transition-colors truncate"
            >
              View in Claude
              <RiArrowRightUpLine className="size-4" />
            </a>
          ) : null}
        </div>
      </div>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {configQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : configQuery.isError ? (
          <div className="text-text-soft text-label-xs p-3">Could not load tools. Try again later.</div>
        ) : (
          <ul className="flex flex-col">
            {CLAUDE_BUILTIN_TOOLS.map((tool) => {
              const isOn = activeByExternalId.has(tool.type);

              return (
                <li
                  key={tool.type}
                  className="border-stroke-soft/60 flex items-center gap-3 px-3 py-2 not-last:border-b"
                >
                  <Switch
                    checked={isOn}
                    disabled={!canEdit || isMutating}
                    onCheckedChange={(checked) => handleToggle(tool, checked)}
                    aria-label={`${isOn ? 'Disable' : 'Enable'} ${tool.name}`}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-text-sub text-label-sm truncate font-medium">{tool.name}</span>
                    {tool.description ? (
                      <span className="text-text-soft text-label-xs truncate">{tool.description}</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {customTools.map((tool) => (
              <li
                key={tool.externalId}
                className="border-stroke-soft/60 flex items-center gap-3 border-t px-3 py-2 not-last:border-b"
              >
                <Switch
                  checked
                  disabled={!canEdit || isMutating}
                  onCheckedChange={() => handleCustomToggleOff(tool)}
                  aria-label={`Disable ${tool.name}`}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="text-text-sub text-label-sm truncate font-medium">{tool.name}</span>
                  {tool.description ? (
                    <span className="text-text-soft text-label-xs truncate">{tool.description}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
