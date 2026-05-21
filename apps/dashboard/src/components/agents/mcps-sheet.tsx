import { CLAUDE_MCP_SERVERS, type ClaudeMcpServer } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import {
  type AgentMcpServer,
  type AgentResponse,
  getAgentRuntimeConfigQueryKey,
  patchAgentRuntimeConfig,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { getMcpIcon } from '@/components/icons/mcp';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { ExternalLink } from '@/components/shared/external-link';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useDataRef } from '@/hooks/use-data-ref';

type McpsSheetProps = {
  agent: AgentResponse;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMcpServers: AgentMcpServer[];
  consoleUrl?: string;
};

function buildSelectedIds(currentMcpServers: AgentMcpServer[]): Set<string> {
  const selected = new Set<string>();

  for (const server of currentMcpServers) {
    const catalogEntry = CLAUDE_MCP_SERVERS.find((entry) => entry.id === server.externalId || entry.url === server.url);

    if (catalogEntry) {
      selected.add(catalogEntry.id);
    }
  }

  return selected;
}

export function McpsSheet({ agent, isOpen, onOpenChange, currentMcpServers, consoleUrl }: McpsSheetProps) {
  const { currentEnvironment, readOnly } = useEnvironment();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => buildSelectedIds(currentMcpServers));
  const currentMcpServersRef = useDataRef(currentMcpServers);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(buildSelectedIds(currentMcpServersRef.current));
      setSearch('');
    }
  }, [currentMcpServersRef, isOpen]);

  const filteredMcps = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return CLAUDE_MCP_SERVERS;

    return CLAUDE_MCP_SERVERS.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.id.toLowerCase().includes(query)
    );
  }, [search]);

  const updateMcps = useMutation({
    mutationFn: (mcpServers: AgentMcpServer[]) =>
      patchAgentRuntimeConfig(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        mcpServers,
      }),
    onSuccess: (config) => {
      queryClient.setQueryData(getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier), config);
      showSuccessToast('MCP servers updated.');
      onOpenChange(false);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not update MCP servers.';
      showErrorToast(message, 'Update failed');
    },
  });

  const canEdit = !readOnly;
  const isMutating = updateMcps.isPending;

  const handleToggle = (entry: ClaudeMcpServer, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (checked) {
        next.add(entry.id);
      } else {
        next.delete(entry.id);
      }

      return next;
    });
  };

  const handleSave = () => {
    const fromCatalog: AgentMcpServer[] = CLAUDE_MCP_SERVERS.filter((entry) => selectedIds.has(entry.id)).map(
      (entry) => ({
        externalId: entry.id,
        name: entry.name,
        url: entry.url,
      })
    );
    const unknown = currentMcpServers.filter(
      (server) => !CLAUDE_MCP_SERVERS.some((entry) => entry.id === server.externalId || entry.url === server.url)
    );
    const next: AgentMcpServer[] = [...fromCatalog, ...unknown];

    updateMcps.mutate(next);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[370px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="space-y-1 p-3 pr-10 text-left sm:text-left">
          <SheetTitle className="text-text-strong text-label-md font-medium">Configure external Claude MCPs</SheetTitle>
          <SheetDescription className="text-text-soft text-paragraph-xs leading-4">
            Configure external MCPs to let your agent communicate with the tools you use.{' '}
            <ExternalLink href="https://docs.claude.com/en/docs/agents-and-tools/mcp">Learn more</ExternalLink>
          </SheetDescription>
        </SheetHeader>

        <div className="px-3 pb-3">
          <Input
            leadingIcon={RiSearchLine}
            placeholder="Search MCPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="xs"
            aria-label="Search MCP servers"
          />
        </div>

        <SheetMain className="flex-1 p-0">
          {filteredMcps.length === 0 ? (
            <div className="text-text-soft text-label-xs p-6 text-center">No MCP servers match your search.</div>
          ) : (
            <ul className="flex flex-col px-2 pb-2">
              {filteredMcps.map((entry) => {
                const checked = selectedIds.has(entry.id);
                const Icon = getMcpIcon(entry.id);

                return (
                  <li
                    key={entry.id}
                    className="hover:bg-bg-weak/60 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
                  >
                    <Switch
                      checked={checked}
                      onCheckedChange={(val) => handleToggle(entry, val)}
                      disabled={!canEdit || isMutating}
                      aria-label={checked ? `Disable ${entry.name}` : `Enable ${entry.name}`}
                    />
                    {Icon ? <Icon className="size-5 shrink-0 -mr-2" aria-hidden /> : null}
                    <span className="text-text-strong text-label-sm min-w-0 flex-1 truncate font-medium">
                      {entry.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SheetMain>

        <Separator />

        <SheetFooter className="flex flex-row! items-center justify-between gap-2 px-3 py-2 sm:justify-between!">
          {consoleUrl ? <ExternalLink href={consoleUrl}>View in Claude</ExternalLink> : <span />}
          <Button
            type="button"
            variant="secondary"
            mode="filled"
            size="xs"
            isLoading={isMutating}
            disabled={!canEdit || isMutating}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
