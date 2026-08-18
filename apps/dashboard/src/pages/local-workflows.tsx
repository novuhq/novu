import { WorkflowResponseDto } from '@novu/shared';
import { FaCode } from 'react-icons/fa6';
import { RiRefreshLine, RiTerminalBoxLine } from 'react-icons/ri';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';
import { Skeleton } from '@/components/primitives/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import TruncatedText from '@/components/truncated-text';
import { WorkflowSteps } from '@/components/workflow-steps';
import { useLocalMode } from '@/context/local-mode';
import { PageHeader } from '@/context/page-header';
import type { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { ConnectionStatus } from '@/utils/types';

const statusDotClass: Record<ConnectionStatus, string> = {
  [ConnectionStatus.CONNECTED]: 'bg-success',
  [ConnectionStatus.LOADING]: 'bg-warning',
  [ConnectionStatus.DISCONNECTED]: 'bg-neutral-300',
};

/**
 * The single "you are looking at your machine" signal for the page: a quiet
 * pill with a live status dot and the tunnel host, full details on hover.
 * The environment picker already says "Local" — no need to repeat it here.
 */
const LocalBridgePill = () => {
  const { healthStatus, bridgeUrl, session } = useLocalMode();
  const isConnected = healthStatus === ConnectionStatus.CONNECTED;

  const tunnelHost = (() => {
    try {
      return session ? new URL(session.tunnelOrigin).host : null;
    } catch {
      return null;
    }
  })();

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="border-neutral-alpha-200 bg-neutral-alpha-50 flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1">
            <span className="relative flex size-1.5">
              {isConnected && (
                <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
              )}
              <span className={`relative inline-flex size-1.5 rounded-full ${statusDotClass[healthStatus]}`} />
            </span>
            {isConnected && tunnelHost ? (
              <span className="text-foreground-600 max-w-[240px] truncate font-mono text-xs">{tunnelHost}</span>
            ) : (
              <span className="text-foreground-600 text-xs">
                {healthStatus === ConnectionStatus.LOADING ? 'Connecting…' : 'Bridge offline'}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[340px]">
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {isConnected ? 'Connected to your local bridge' : 'Local bridge is not reachable'}
            </span>
            {bridgeUrl && <span className="break-all font-mono text-xs opacity-80">{bridgeUrl}</span>}
            <span className="text-xs opacity-80">
              Workflows stream live from your machine — nothing here is saved to Novu Cloud.
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const DisconnectedState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
    <RiTerminalBoxLine className="text-foreground-400 size-8" />
    <div className="flex flex-col gap-1">
      <span className="text-foreground-900 text-sm font-medium">Local bridge is not reachable</span>
      <span className="text-foreground-600 text-xs">
        Start your app and run <code className="bg-neutral-alpha-100 rounded px-1 py-0.5">npx novu dev</code> to
        reconnect.
      </span>
    </div>
  </div>
);

const WorkflowRows = ({
  workflows,
  environmentSlug,
}: {
  workflows: WorkflowResponseDto[];
  environmentSlug: string;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Workflow</TableHead>
        <TableHead>Steps</TableHead>
        <TableHead>Tags</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {workflows.map((workflow) => (
        <TableRow key={workflow.workflowId} className="relative isolate">
          <TableCell>
            <div className="flex items-center gap-2">
              <FaCode className="text-warning size-3.5 shrink-0" title="Code-first workflow" />
              <div className="flex flex-col">
                <Link
                  to={buildRoute(ROUTES.LOCAL_EDIT_WORKFLOW, {
                    environmentSlug,
                    workflowSlug: workflow.slug,
                  })}
                  className="text-foreground-900 text-sm font-medium after:absolute after:inset-0"
                >
                  <TruncatedText className="max-w-[360px]">{workflow.name}</TruncatedText>
                </Link>
                {workflow.workflowId !== workflow.name && (
                  <span className="text-foreground-400 font-mono text-xs">{workflow.workflowId}</span>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell>
            <WorkflowSteps steps={workflow.steps.map((step) => step.type as unknown as StepTypeEnum)} />
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {(workflow.tags || []).map((tag) => (
                <Badge key={tag} variant="lighter" size="sm" color="gray">
                  {tag}
                </Badge>
              ))}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/**
 * The workflows list of the "Local" pseudo-environment: the live `discover`
 * output of the developer's local bridge, refreshed continuously. Nothing here
 * is persisted — the Development environment keeps showing the synced state.
 */
export const LocalWorkflowsPage = () => {
  const { environmentSlug = '' } = useParams<{ environmentSlug?: string }>();
  const { isEnabled, workflows, isDiscoverPending, healthStatus } = useLocalMode();

  if (!isEnabled) {
    return <Navigate to={ROUTES.LOCAL_HANDSHAKE} replace />;
  }

  const isDisconnected = healthStatus === ConnectionStatus.DISCONNECTED && !workflows;

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2.5">
          <h1 className="text-foreground-950">Local workflows</h1>
          <LocalBridgePill />
        </div>
      </PageHeader>
      {isDisconnected ? (
        <DisconnectedState />
      ) : isDiscoverPending && !workflows ? (
        <div className="flex flex-col gap-2 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : workflows && workflows.length > 0 ? (
        <WorkflowRows workflows={workflows} environmentSlug={environmentSlug} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
          <RiRefreshLine className="text-foreground-400 size-8" />
          <div className="flex flex-col gap-1">
            <span className="text-foreground-900 text-sm font-medium">No workflows discovered</span>
            <span className="text-foreground-600 text-xs">
              Define workflows with <code className="bg-neutral-alpha-100 rounded px-1 py-0.5">@novu/framework</code> in
              your app — they will appear here automatically.
            </span>
          </div>
        </div>
      )}
    </>
  );
};
