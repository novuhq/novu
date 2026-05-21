'use client';

import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react';
import { MCP_SERVERS, type McpServer } from '@novu/shared';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCcw,
  Server,
  Trash2,
  Unlink,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { novuConfig } from '@/utils/config';
import { FlowSimulator } from './components/flow-simulator';
import { type Credentials, useEnvironmentId } from './lib/credentials';
import {
  type AgentMcpServerEnablement,
  type AgentSummary,
  disableAgentMcpServer,
  type EnvironmentSummary,
  enableAgentMcpServer,
  generateMcpOAuthUrl,
  getMcpConnectionStatus,
  listAgentMcpServers,
  listAgents,
  listEnvironments,
  McpApiError,
  type McpConnectionView,
} from './lib/mcp-api';

const SELECTED_AGENT_STORAGE_KEY = 'novu-mcp-playground-selected-agent';
const SUBSCRIBER_STORAGE_KEY = 'novu-mcp-playground-subscriber-id';

type OAuthResultMessage = {
  type: 'novu-mcp-oauth-result';
  status: 'connected' | 'error';
  reason?: string;
};

export default function AgentsMcpPlaygroundPage() {
  return (
    <>
      <SignedOut>
        <SignInGate />
      </SignedOut>
      <SignedIn>
        <AuthenticatedPlayground />
      </SignedIn>
    </>
  );
}

function SignInGate() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-8">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="font-semibold text-base">Agent MCP OAuth playground</h1>
          <p className="text-xs text-muted-foreground">
            Sign in with the same Clerk user you use in the dashboard to use this playground.
          </p>
        </div>
        <SignIn routing="hash" />
      </div>
    </div>
  );
}

function AuthenticatedPlayground() {
  const { environmentId, hydrated, setEnvironmentId, clear } = useEnvironmentId();

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading playground...</div>
    );
  }

  if (!environmentId) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b px-6 py-4 shrink-0">
          <HeaderBar />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl">
            <EnvironmentPicker onPick={setEnvironmentId} title="Pick an environment to get started" />
          </div>
        </div>
      </div>
    );
  }

  const credentials: Credentials = { environmentId };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-6 py-4 shrink-0">
        <HeaderBar />
      </div>
      <div className="border-b bg-muted/30 px-6 py-3 shrink-0">
        <EnvironmentBar environmentId={environmentId} onChange={setEnvironmentId} onClear={clear} />
      </div>
      <div className="flex-1 overflow-hidden">
        <PlaygroundBody credentials={credentials} />
      </div>
    </div>
  );
}

function HeaderBar() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Header />
      <UserButton afterSignOutUrl="/agents-mcp" />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Server className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-sm">Agent MCP OAuth</h1>
        <p className="text-xs text-muted-foreground">
          Drive the MCP enable / disable / authorize flow against a locally running Novu API. Dev tool only — never
          paste a production JWT.
        </p>
      </div>
    </div>
  );
}

function EnvironmentPicker({
  onPick,
  title,
  initialValue,
}: {
  onPick: (environmentId: string) => void;
  title: string;
  initialValue?: string;
}) {
  const { user } = useUser();
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(initialValue ?? '');

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-fetch only when the Clerk user changes; `selected` is read for initial-pick only.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listEnvironments()
      .then((list) => {
        if (cancelled) return;
        setEnvironments(list);
        if (!selected && list.length > 0) {
          setSelected(list[0]._id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toErrorMessage(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const canSubmit = selected.length > 0 && !loading && !error;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">
          Environments are loaded from <code>/v1/environments</code> using your Clerk session. The picker uses your
          active Clerk organization.
        </p>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs">Could not load environments</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : null}
      <Select value={selected} onValueChange={setSelected} disabled={loading || environments.length === 0}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={loading ? 'Loading environments…' : 'Select an environment'} />
        </SelectTrigger>
        <SelectContent>
          {environments.map((env) => (
            <SelectItem key={env._id} value={env._id}>
              <span className="font-medium">{env.name}</span>
              <span className="ml-2 text-muted-foreground font-mono text-[10px]">{env._id}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button disabled={!canSubmit} onClick={() => canSubmit && onPick(selected)}>
        Continue
      </Button>
    </div>
  );
}

function EnvironmentBar({
  environmentId,
  onChange,
  onClear,
}: {
  environmentId: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="space-y-2 text-xs">
        <EnvironmentPicker
          initialValue={environmentId}
          title="Switch environment"
          onPick={(next) => {
            onChange(next);
            setEditing(false);
          }}
        />
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">
        Env <span className="font-mono text-foreground">{environmentId}</span> · Clerk session auto-refreshes JWT
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Switch environment
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

function PlaygroundBody({ credentials }: { credentials: Credentials }) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;

    return window.localStorage.getItem(SELECTED_AGENT_STORAGE_KEY) ?? undefined;
  });

  const reloadAgents = useCallback(async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const list = await listAgents(credentials);
      setAgents(list);
      if (list.length > 0 && (!selectedAgent || !list.find((a) => a.identifier === selectedAgent))) {
        setSelectedAgent(list[0].identifier);
      }
    } catch (err) {
      setAgentsError(toErrorMessage(err));
    } finally {
      setAgentsLoading(false);
    }
  }, [credentials, selectedAgent]);

  useEffect(() => {
    reloadAgents();
  }, [reloadAgents]);

  useEffect(() => {
    if (selectedAgent) {
      window.localStorage.setItem(SELECTED_AGENT_STORAGE_KEY, selectedAgent);
    }
  }, [selectedAgent]);

  const selectedAgentObject = useMemo(
    () => agents.find((agent) => agent.identifier === selectedAgent) ?? null,
    [agents, selectedAgent]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-6 py-3 shrink-0">
        <AgentPicker
          agents={agents}
          loading={agentsLoading}
          error={agentsError}
          value={selectedAgent}
          onChange={setSelectedAgent}
          onReload={reloadAgents}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedAgentObject ? (
          <AgentMcpPanel credentials={credentials} agent={selectedAgentObject} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {agentsLoading ? 'Loading agents…' : 'No agent selected. Create one in the dashboard first.'}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentPicker({
  agents,
  loading,
  error,
  value,
  onChange,
  onReload,
}: {
  agents: AgentSummary[];
  loading: boolean;
  error: string | null;
  value: string | undefined;
  onChange: (identifier: string) => void;
  onReload: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">Agent</span>
      <div className="min-w-0 flex-1 max-w-md">
        <Select value={value} onValueChange={onChange} disabled={loading || agents.length === 0}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={loading ? 'Loading…' : 'Select an agent'} />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent._id} value={agent.identifier}>
                <span className="font-medium">{agent.name}</span>
                <span className="ml-2 text-muted-foreground">
                  {agent.identifier} · {agent.runtime ?? 'unknown runtime'}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="sm" onClick={onReload} disabled={loading}>
        <RefreshCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        <span className="ml-1">Refresh</span>
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

function AgentMcpPanel({ credentials, agent }: { credentials: Credentials; agent: AgentSummary }) {
  const agentIdentifier = agent.identifier;
  const [enablements, setEnablements] = useState<AgentMcpServerEnablement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyMcpId, setBusyMcpId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeMcpId, setActiveMcpId] = useState<string | null>(null);

  // Lifted up so both `OAuthPanel` and `FlowSimulator` operate on the same
  // subscriber id without duplicating the input.
  const [subscriberId, setSubscriberId] = useState<string>(() => {
    if (typeof window === 'undefined') return novuConfig.subscriberId ?? '';

    return window.localStorage.getItem(SUBSCRIBER_STORAGE_KEY) ?? novuConfig.subscriberId ?? '';
  });

  useEffect(() => {
    if (!subscriberId) return;
    window.localStorage.setItem(SUBSCRIBER_STORAGE_KEY, subscriberId);
  }, [subscriberId]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAgentMcpServers(credentials, agentIdentifier);
      setEnablements(list);
      if (list.length > 0 && (!activeMcpId || !list.find((row) => row.mcpId === activeMcpId))) {
        setActiveMcpId(list[0].mcpId);
      } else if (list.length === 0) {
        setActiveMcpId(null);
      }
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [credentials, agentIdentifier, activeMcpId]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, agentIdentifier]);

  const handleEnable = useCallback(
    async (mcpId: string) => {
      setBusyMcpId(mcpId);
      setActionError(null);
      try {
        await enableAgentMcpServer(credentials, agentIdentifier, { mcpId });
        setActiveMcpId(mcpId);
        await reload();
      } catch (err) {
        setActionError(`Failed to enable ${mcpId}: ${toErrorMessage(err)}`);
      } finally {
        setBusyMcpId(null);
      }
    },
    [credentials, agentIdentifier, reload]
  );

  const handleDisable = useCallback(
    async (mcpId: string) => {
      if (!confirm(`Disable ${mcpId}? All subscriber connections for this MCP will be cascade-deleted.`)) return;
      setBusyMcpId(mcpId);
      setActionError(null);
      try {
        await disableAgentMcpServer(credentials, agentIdentifier, mcpId);
        if (activeMcpId === mcpId) setActiveMcpId(null);
        await reload();
      } catch (err) {
        setActionError(`Failed to disable ${mcpId}: ${toErrorMessage(err)}`);
      } finally {
        setBusyMcpId(null);
      }
    },
    [credentials, agentIdentifier, reload, activeMcpId]
  );

  const enabledMcpIds = useMemo(() => new Set(enablements.map((row) => row.mcpId)), [enablements]);
  const activeEnablement = useMemo(
    () => enablements.find((row) => row.mcpId === activeMcpId) ?? null,
    [enablements, activeMcpId]
  );

  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden">
      <div className="grid grid-cols-1 overflow-hidden border-b lg:grid-cols-[1fr_1fr_1fr]">
        <CatalogPanel
          enabledMcpIds={enabledMcpIds}
          onEnable={handleEnable}
          busyMcpId={busyMcpId}
          actionError={actionError}
        />
        <EnabledPanel
          loading={loading}
          error={error}
          enablements={enablements}
          activeMcpId={activeMcpId}
          onSelect={setActiveMcpId}
          onDisable={handleDisable}
          onReload={reload}
          busyMcpId={busyMcpId}
        />
        <OAuthPanel
          credentials={credentials}
          agentIdentifier={agentIdentifier}
          enablement={activeEnablement}
          subscriberId={subscriberId}
          onSubscriberIdChange={setSubscriberId}
        />
      </div>
      <FlowSimulator
        credentials={credentials}
        agent={agent}
        enablement={activeEnablement}
        subscriberId={subscriberId}
      />
    </div>
  );
}

function CatalogPanel({
  enabledMcpIds,
  onEnable,
  busyMcpId,
  actionError,
}: {
  enabledMcpIds: Set<string>;
  onEnable: (mcpId: string) => Promise<void> | void;
  busyMcpId: string | null;
  actionError: string | null;
}) {
  const popular = useMemo(() => MCP_SERVERS.filter((mcp: McpServer) => mcp.popular), []);
  const others = useMemo(() => MCP_SERVERS.filter((mcp: McpServer) => !mcp.popular), []);
  return (
    <div className="flex h-full flex-col overflow-hidden border-r">
      <div className="border-b px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold">Catalog</h2>
        <p className="text-xs text-muted-foreground">{MCP_SERVERS.length} MCPs in catalog</p>
      </div>
      {actionError ? (
        <Alert variant="destructive" className="m-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs">Action failed</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <CatalogGroup
          title="Popular"
          servers={popular}
          enabledMcpIds={enabledMcpIds}
          onEnable={onEnable}
          busyMcpId={busyMcpId}
        />
        <CatalogGroup
          title="All others"
          servers={others}
          enabledMcpIds={enabledMcpIds}
          onEnable={onEnable}
          busyMcpId={busyMcpId}
        />
      </div>
    </div>
  );
}

function CatalogGroup({
  title,
  servers,
  enabledMcpIds,
  onEnable,
  busyMcpId,
}: {
  title: string;
  servers: McpServer[];
  enabledMcpIds: Set<string>;
  onEnable: (mcpId: string) => Promise<void> | void;
  busyMcpId: string | null;
}) {
  if (servers.length === 0) return null;

  return (
    <div>
      <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="space-y-1">
        {servers.map((mcp) => (
          <CatalogRow
            key={mcp.id}
            mcp={mcp}
            enabled={enabledMcpIds.has(mcp.id)}
            busy={busyMcpId === mcp.id}
            onEnable={onEnable}
          />
        ))}
      </ul>
    </div>
  );
}

function CatalogRow({
  mcp,
  enabled,
  busy,
  onEnable,
}: {
  mcp: McpServer;
  enabled: boolean;
  busy: boolean;
  onEnable: (mcpId: string) => Promise<void> | void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border bg-card/40 p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs">{mcp.name}</span>
          <code className="text-[10px] text-muted-foreground">{mcp.id}</code>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{mcp.description}</p>
      </div>
      <Button
        size="sm"
        variant={enabled ? 'ghost' : 'outline'}
        disabled={enabled || busy}
        onClick={() => onEnable(mcp.id)}
        className="shrink-0"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : enabled ? 'Enabled' : 'Enable'}
      </Button>
    </li>
  );
}

function EnabledPanel({
  loading,
  error,
  enablements,
  activeMcpId,
  onSelect,
  onDisable,
  onReload,
  busyMcpId,
}: {
  loading: boolean;
  error: string | null;
  enablements: AgentMcpServerEnablement[];
  activeMcpId: string | null;
  onSelect: (mcpId: string) => void;
  onDisable: (mcpId: string) => Promise<void> | void;
  onReload: () => void;
  busyMcpId: string | null;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r">
      <div className="border-b px-4 py-3 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Enabled on agent</h2>
          <p className="text-xs text-muted-foreground">{enablements.length} active</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReload} disabled={loading}>
          <RefreshCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs">Failed to load MCPs</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : null}
        {loading && enablements.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">Loading…</div>
        ) : null}
        {!loading && !error && enablements.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
            No MCPs enabled. Pick one from the catalog.
          </div>
        ) : null}
        {enablements.map((row) => (
          <EnablementRow
            key={row.id}
            row={row}
            active={row.mcpId === activeMcpId}
            onSelect={() => onSelect(row.mcpId)}
            onDisable={() => onDisable(row.mcpId)}
            busy={busyMcpId === row.mcpId}
          />
        ))}
      </div>
    </div>
  );
}

function EnablementRow({
  row,
  active,
  onSelect,
  onDisable,
  busy,
}: {
  row: AgentMcpServerEnablement;
  active: boolean;
  onSelect: () => void;
  onDisable: () => Promise<void> | void;
  busy: boolean;
}) {
  const status = row.status;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 rounded-md border bg-card/40 p-2.5 text-left transition-colors hover:bg-accent/40',
        active && 'border-primary/50 bg-accent/60'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-xs">{row.mcpId}</span>
        <StatusBadge status={status} />
        <Badge variant="outline" className="text-[10px] py-0">
          {row.defaultAuthMode}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{row.defaultScope}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onDisable();
          }}
          className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          <span className="ml-1">Disable</span>
        </Button>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: AgentMcpServerEnablement['status'] }) {
  if (status === 'active')
    return (
      <Badge variant="secondary" className="text-[10px] py-0">
        active
      </Badge>
    );
  if (status === 'syncing')
    return (
      <Badge variant="outline" className="text-[10px] py-0">
        syncing
      </Badge>
    );
  if (status === 'error')
    return (
      <Badge variant="destructive" className="text-[10px] py-0">
        error
      </Badge>
    );

  return (
    <Badge variant="outline" className="text-[10px] py-0">
      disabled
    </Badge>
  );
}

function OAuthPanel({
  credentials,
  agentIdentifier,
  enablement,
  subscriberId,
  onSubscriberIdChange,
}: {
  credentials: Credentials;
  agentIdentifier: string;
  enablement: AgentMcpServerEnablement | null;
  subscriberId: string;
  onSubscriberIdChange: (next: string) => void;
}) {
  const [connection, setConnection] = useState<McpConnectionView | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [authorizeError, setAuthorizeError] = useState<string | null>(null);
  const [authorizePopup, setAuthorizePopup] = useState<Window | null>(null);
  const [lastResultBanner, setLastResultBanner] = useState<OAuthResultMessage | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!enablement || !subscriberId.trim()) {
      setConnection(null);

      return;
    }

    setStatusLoading(true);
    setStatusError(null);
    try {
      const next = await getMcpConnectionStatus(credentials, agentIdentifier, enablement.mcpId, subscriberId.trim());
      setConnection(next);
    } catch (err) {
      setStatusError(toErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  }, [credentials, agentIdentifier, enablement, subscriberId]);

  useEffect(() => {
    setConnection(null);
    setStatusError(null);
    setAuthorizeError(null);
    setLastResultBanner(null);
  }, [enablement?.id]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as OAuthResultMessage | undefined;
      if (!data || data.type !== 'novu-mcp-oauth-result') return;
      setLastResultBanner(data);
      refreshStatus();
    }

    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, [refreshStatus]);

  useEffect(() => {
    if (!authorizePopup) return;

    const interval = setInterval(() => {
      if (authorizePopup.closed) {
        clearInterval(interval);
        setAuthorizePopup(null);
        refreshStatus();
      }
    }, 600);

    return () => clearInterval(interval);
  }, [authorizePopup, refreshStatus]);

  const handleAuthorize = useCallback(async () => {
    if (!enablement || !subscriberId.trim()) return;
    setAuthorizing(true);
    setAuthorizeError(null);
    setLastResultBanner(null);

    try {
      const { authorizeUrl } = await generateMcpOAuthUrl(credentials, agentIdentifier, enablement.mcpId, {
        subscriberId: subscriberId.trim(),
      });
      // Intentionally omit `noopener`: the same-origin OAuth result page calls
      // `window.opener.postMessage(...)` to deliver the outcome, which requires
      // opener access.
      const popup = window.open(authorizeUrl, 'novu-mcp-oauth', 'width=520,height=720,scrollbars=yes');
      if (!popup) {
        setAuthorizeError('Browser blocked the popup. Allow popups for this site and retry.');

        return;
      }
      setAuthorizePopup(popup);
    } catch (err) {
      setAuthorizeError(toErrorMessage(err));
    } finally {
      setAuthorizing(false);
    }
  }, [credentials, agentIdentifier, enablement, subscriberId]);

  if (!enablement) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Select an enabled MCP on the left to authorize a subscriber connection.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold">Subscriber connection · {enablement.mcpId}</h2>
        <p className="text-xs text-muted-foreground">
          Scope <code>{enablement.defaultScope}</code> · auth mode <code>{enablement.defaultAuthMode}</code>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-medium">Subscriber id (external)</span>
          <Input
            value={subscriberId}
            onChange={(e) => onSubscriberIdChange(e.target.value)}
            placeholder="external subscriber id"
            className="font-mono text-xs"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleAuthorize}
            disabled={authorizing || !subscriberId.trim() || enablement.defaultAuthMode !== 'dcr'}
            size="sm"
          >
            {authorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            <span className="ml-1">Authorize</span>
          </Button>
          <Button variant="outline" size="sm" onClick={refreshStatus} disabled={statusLoading || !subscriberId.trim()}>
            <RefreshCcw className={cn('h-3.5 w-3.5', statusLoading && 'animate-spin')} />
            <span className="ml-1">Refresh status</span>
          </Button>
        </div>

        {enablement.defaultAuthMode !== 'dcr' ? (
          <Alert>
            <Unlink className="h-4 w-4" />
            <AlertTitle className="text-xs">No DCR support</AlertTitle>
            <AlertDescription className="text-xs">
              This MCP is registered with auth mode <code>{enablement.defaultAuthMode}</code>. The Authorize button is
              only wired for <code>dcr</code> mode.
            </AlertDescription>
          </Alert>
        ) : null}

        {authorizeError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs">Authorize failed</AlertTitle>
            <AlertDescription className="text-xs">{authorizeError}</AlertDescription>
          </Alert>
        ) : null}

        {lastResultBanner ? (
          <Alert variant={lastResultBanner.status === 'connected' ? 'default' : 'destructive'}>
            {lastResultBanner.status === 'connected' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle className="text-xs">
              {lastResultBanner.status === 'connected' ? 'OAuth complete' : 'OAuth failed'}
            </AlertTitle>
            {lastResultBanner.reason ? (
              <AlertDescription className="text-xs">{lastResultBanner.reason}</AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        <Separator />

        <ConnectionStatus connection={connection} loading={statusLoading} error={statusError} />
      </div>
    </div>
  );
}

function ConnectionStatus({
  connection,
  loading,
  error,
}: {
  connection: McpConnectionView | null;
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-xs">Failed to load connection</AlertTitle>
        <AlertDescription className="text-xs">{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading && !connection) {
    return <div className="text-xs text-muted-foreground">Loading connection status…</div>;
  }

  if (!connection) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        No connection on file for this subscriber yet. Click Authorize to start the OAuth handshake.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card/40 p-3 text-xs space-y-1.5">
      <Row label="Status" value={<ConnectionStatusBadge status={connection.status} />} />
      <Row label="Auth mode" value={connection.authMode} />
      <Row label="Scope" value={connection.scope} />
      {connection.subscriberId ? <Row label="Subscriber" value={<code>{connection.subscriberId}</code>} /> : null}
      {connection.connectedAt ? (
        <Row label="Connected" value={new Date(connection.connectedAt).toLocaleString()} />
      ) : null}
      {connection.expiresAt ? <Row label="Expires" value={new Date(connection.expiresAt).toLocaleString()} /> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function ConnectionStatusBadge({ status }: { status: McpConnectionView['status'] }) {
  if (status === 'connected')
    return (
      <Badge variant="default" className="text-[10px] py-0">
        connected
      </Badge>
    );
  if (status === 'pending_oauth')
    return (
      <Badge variant="outline" className="text-[10px] py-0">
        pending
      </Badge>
    );
  if (status === 'expired')
    return (
      <Badge variant="outline" className="text-[10px] py-0">
        expired
      </Badge>
    );
  if (status === 'revoked')
    return (
      <Badge variant="destructive" className="text-[10px] py-0">
        revoked
      </Badge>
    );

  return (
    <Badge variant="destructive" className="text-[10px] py-0">
      {status}
    </Badge>
  );
}

function toErrorMessage(err: unknown): string {
  if (err instanceof McpApiError) {
    return `${err.status} · ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}
