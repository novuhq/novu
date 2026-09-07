import {
  type EnvironmentEnum,
  EnvironmentTypeEnum,
  type IEnvironment,
  PermissionsEnum,
  PROTECTED_ENVIRONMENTS,
} from '@novu/shared';
import { useMemo, useState } from 'react';
import { RiDeleteBin2Line, RiInformation2Line, RiMore2Fill } from 'react-icons/ri';
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteEnvironment } from '@/hooks/use-environments';
import { Protect } from '@/utils/protect';
import { cn } from '@/utils/ui';
import { Badge } from '../primitives/badge';
import { CompactButton } from '../primitives/button-compact';
import { CopyButton } from '../primitives/copy-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { Skeleton } from '../primitives/skeleton';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { TimeDisplayHoverCard } from '../time-display-hover-card';
import TruncatedText from '../truncated-text';
import { DeleteEnvironmentDialog } from './delete-environment-dialog';
import { EditEnvironmentSheet } from './edit-environment-sheet';

const EnvironmentRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-32" />
    </TableCell>
    <TableCell className="w-1">
      <Skeleton className="size-8 rounded-md" />
    </TableCell>
  </TableRow>
);

const EnvironmentSectionHeader = () => (
  <TableRow>
    <TableCell colSpan={4} className="px-3 py-1 bg-bg-weak">
      <div className="flex items-center gap-1 text-paragraph-2xs text-text-soft">
        Live Environments
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block cursor-help">
              <RiInformation2Line className="size-3 text-foreground-400" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Live environments are read only. Use them for staging, QA, previews. Great for safe reviews and testing!
          </TooltipContent>
        </Tooltip>
      </div>
    </TableCell>
  </TableRow>
);

export function EnvironmentsList({ environments, isLoading }: { environments: IEnvironment[]; isLoading: boolean }) {
  const { currentEnvironment } = useEnvironment();
  const [editEnvironment, setEditEnvironment] = useState<IEnvironment>();
  const [deleteEnvironment, setDeleteEnvironment] = useState<IEnvironment>();
  const { mutateAsync: deleteEnvironmentAction, isPending: isDeletePending } = useDeleteEnvironment();

  const groupedEnvironments = useMemo(() => {
    const devEnvironments = environments.filter((env) => env.type === EnvironmentTypeEnum.DEV);
    const liveEnvironments = environments.filter((env) => env.type === EnvironmentTypeEnum.PROD);

    return { devEnvironments, liveEnvironments };
  }, [environments]);

  const onDeleteEnvironment = async () => {
    if (!deleteEnvironment) return;

    try {
      await deleteEnvironmentAction({ environment: deleteEnvironment });
      showSuccessToast('Environment deleted successfully');

      setDeleteEnvironment(undefined);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string | string[] } }; message?: string };
      const message = error?.response?.data?.message || error?.message || 'Failed to delete environment';
      showErrorToast(Array.isArray(message) ? message[0] : message);
    }
  };

  const handleDeleteClick = (environment: IEnvironment) => {
    setDeleteEnvironment(environment);
  };

  const renderEnvironmentRow = (environment: IEnvironment) => (
    <TableRow key={environment._id} className="group relative isolate">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <EnvironmentBranchIcon size="sm" environment={environment} />
          <div className="flex items-center gap-1">
            <TruncatedText className="max-w-[32ch]">{environment.name}</TruncatedText>
            {environment._id === currentEnvironment?._id && (
              <Badge color="blue" size="sm" variant="lighter">
                Current
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 transition-opacity duration-200">
          <TruncatedText className="text-foreground-400 font-code block text-xs">
            {environment.identifier}
          </TruncatedText>
          <CopyButton
            className="z-10 flex size-2 p-0 px-1 opacity-0 group-hover:opacity-100"
            valueToCopy={environment.identifier}
            size="2xs"
          />
        </div>
      </TableCell>
      <TableCell className={cn('text-foreground-600 min-w-[180px] text-sm font-medium')}>
        <TimeDisplayHoverCard date={new Date(environment.updatedAt)}>
          {new Date(environment.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </TimeDisplayHoverCard>
      </TableCell>
      <TableCell className="h-[49px] w-1">
        <Protect permission={PermissionsEnum.ENVIRONMENT_WRITE}>
          {!PROTECTED_ENVIRONMENTS.includes(environment.name as EnvironmentEnum) && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <CompactButton icon={RiMore2Fill} variant="ghost" className="z-10 h-8 w-8 p-0"></CompactButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent alignOffset={5} align="end">
                <DropdownMenuGroup>
                  <Protect permission={PermissionsEnum.ENVIRONMENT_WRITE}>
                    <DropdownMenuItem onSelect={() => setEditEnvironment(environment)}>
                      Edit environment
                    </DropdownMenuItem>
                  </Protect>
                  <Protect permission={PermissionsEnum.ENVIRONMENT_WRITE}>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => handleDeleteClick(environment)}
                      disabled={
                        environment._id === currentEnvironment?._id ||
                        PROTECTED_ENVIRONMENTS.includes(environment.name as EnvironmentEnum)
                      }
                    >
                      <RiDeleteBin2Line />
                      Delete environment
                    </DropdownMenuItem>
                  </Protect>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </Protect>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Identifier</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-1"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <EnvironmentRowSkeleton key={i} />)
          ) : (
            <>
              {groupedEnvironments.devEnvironments.map(renderEnvironmentRow)}
              {groupedEnvironments.liveEnvironments.length > 0 && (
                <>
                  <EnvironmentSectionHeader />
                  {groupedEnvironments.liveEnvironments.map(renderEnvironmentRow)}
                </>
              )}
            </>
          )}
        </TableBody>
      </Table>
      <EditEnvironmentSheet
        environment={editEnvironment}
        isOpen={!!editEnvironment}
        onOpenChange={(open) => !open && setEditEnvironment(undefined)}
      />
      <DeleteEnvironmentDialog
        environment={deleteEnvironment}
        open={!!deleteEnvironment}
        onOpenChange={(open) => !open && setDeleteEnvironment(undefined)}
        onConfirm={onDeleteEnvironment}
        isLoading={isDeletePending}
      />
    </>
  );
}
