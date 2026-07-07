import { WorkflowResponseDto } from '@novu/shared';
import { FaCode } from 'react-icons/fa6';
import { RiRefreshLine, RiTerminalBoxLine } from 'react-icons/ri';
import { Link, Navigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/primitives/badge';
import { Skeleton } from '@/components/primitives/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import TruncatedText from '@/components/truncated-text';
import { WorkflowSteps } from '@/components/workflow-steps';
import { useLocalMode } from '@/context/local-mode';
import type { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { ConnectionStatus } from '@/utils/types';

const LocalBridgeStatus = () => {
  const { healthStatus, bridgeUrl } = useLocalMode();
  const isConnected = healthStatus === ConnectionStatus.CONNECTED;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block size-2 rounded-full ${
          isConnected ? 'bg-success' : healthStatus === ConnectionStatus.LOADING ? 'bg-warning' : 'bg-destructive'
        }`}
      />
      <span className="text-foreground-600 text-xs">
        {isConnected ? 'Connected to local bridge' : 'Local bridge disconnected'}
      </span>
      {bridgeUrl && (
        <span className="text-foreground-400 max-w-[280px] truncate font-mono text-xs" title={bridgeUrl}>
          {bridgeUrl}
        </span>
      )}
    </div>
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
                <span className="text-foreground-400 font-mono text-xs">{workflow.workflowId}</span>
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
    <DashboardLayout
      showBridgeUrl={false}
      headerStartItems={
        <div className="flex items-center gap-3">
          <h1 className="text-foreground-950 flex items-center gap-2">
            Local workflows
            <Badge variant="light" size="sm" color="orange">
              LOCAL
            </Badge>
          </h1>
          <LocalBridgeStatus />
        </div>
      }
    >
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
              Define workflows with <code className="bg-neutral-alpha-100 rounded px-1 py-0.5">@novu/framework</code>{' '}
              in your app — they will appear here automatically.
            </span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
