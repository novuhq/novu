import { PermissionsEnum } from '@novu/shared';
import { RiMore2Fill, RiRobot2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Skeleton } from '@/components/primitives/skeleton';
import { useHasPermission } from '@/hooks/use-has-permission';

type AgentDetailsHeaderProps = {
  agent: AgentResponse | undefined;
  isLoading: boolean;
  onRequestDelete?: (agent: AgentResponse) => void;
};

export function AgentDetailsHeader({ agent, isLoading, onRequestDelete }: AgentDetailsHeaderProps) {
  const has = useHasPermission();
  const canWrite = has({ permission: PermissionsEnum.AGENT_WRITE });

  if (isLoading || !agent) {
    return (
      <header className="px-4 pt-2 pb-2 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Skeleton className="h-6 w-[min(100%,20ch)]" />
            <Skeleton className="h-4 w-[min(100%,24ch)]" />
          </div>
          <div className="flex shrink-0 gap-3">
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="px-4 pt-2 pb-2 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-text-strong text-[18px] font-medium leading-6 tracking-tight">{agent.name}</h1>
            {agent.devBridgeActive ? (
              <Badge variant="lighter" color="orange" size="sm">
                LOCAL
              </Badge>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <RiRobot2Line className="text-text-sub size-4 shrink-0" aria-hidden />
            <span className="text-text-soft font-mono text-label-xs leading-4 tracking-tight">{agent.identifier}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {canWrite && onRequestDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  mode="outline"
                  size="xs"
                  leadingIcon={RiMore2Fill}
                  type="button"
                  className="text-text-sub size-8 min-w-8 shrink-0 gap-0 rounded-md px-0"
                >
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => {
                    setTimeout(() => onRequestDelete(agent), 0);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
