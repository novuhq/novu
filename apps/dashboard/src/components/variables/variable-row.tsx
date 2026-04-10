import { IEnvironment, PermissionsEnum } from '@novu/shared';
import React, { useState } from 'react';
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCornerDownRightLine,
  RiDeleteBin2Line,
  RiEditLine,
  RiEyeLine,
  RiEyeOffLine,
  RiMore2Fill,
} from 'react-icons/ri';
import type { EnvironmentVariableResponseDto } from '@/api/environment-variables';
import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { Skeleton } from '@/components/primitives/skeleton';
import { TableCell, TableRow } from '@/components/primitives/table';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { useDeleteEnvironmentVariable } from '@/hooks/use-delete-environment-variable';
import { formatDateSimple } from '@/utils/format-date';
import { Protect } from '@/utils/protect';
import { cn } from '@/utils/ui';
import { DeleteVariableDialog } from './delete-variable-dialog';
import { UpsertVariableDrawer } from './upsert-variable-drawer';

const SECRET_MASK = '••••••••';

type VariableRowProps = {
  variable: EnvironmentVariableResponseDto;
  currentEnvironment?: IEnvironment;
  environments?: IEnvironment[];
};

type CellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

const VariableCell = ({ children, className, ...rest }: CellProps) => (
  <TableCell className={cn('group-hover/row:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
    {children}
  </TableCell>
);

function CoverageBadge({ filledCount, totalCount }: { filledCount: number; totalCount: number }) {
  const isFull = filledCount === totalCount;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
        isFull ? 'bg-success/10 text-success-600' : 'bg-warning/10 text-warning-600'
      )}
    >
      {isFull ? <RiCheckLine className="size-3" /> : <RiAlertLine className="size-3" />}
      {filledCount}/{totalCount}
      {!isFull && ' SET'}
    </span>
  );
}

function EnvironmentSubRow({
  variable,
  environment,
}: {
  variable: EnvironmentVariableResponseDto;
  environment: IEnvironment;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const envValue = variable.values.find((v) => v._environmentId === environment._id);
  const displayValue = !isRevealed && envValue?.value ? SECRET_MASK : (envValue?.value ?? '');

  return (
    <TableRow className="bg-neutral-alpha-25 hover:bg-neutral-alpha-50">
      <TableCell className="pl-8">
        <div className="flex items-center gap-2">
          <RiCornerDownRightLine className="text-text-disabled size-4 shrink-0" />
          <EnvironmentBranchIcon environment={environment} size="sm" />
          <span className="text-text-sub text-xs font-medium">{environment.name}</span>
        </div>
      </TableCell>
      <TableCell>
        {envValue ? (
          <div className="flex items-center gap-1">
            <span className="font-code text-text-strong max-w-[300px] truncate text-xs">{displayValue}</span>
            <button
              type="button"
              className="text-text-sub hover:text-text-strong hover:bg-bg-weak inline-flex items-center justify-center rounded p-1 transition duration-200 ease-out"
              onClick={() => setIsRevealed((prev) => !prev)}
            >
              {isRevealed ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
            </button>
            <CopyButton valueToCopy={envValue?.value ?? ''} size="xs" className="p-1" />
          </div>
        ) : (
          <span className="text-text-disabled text-xs italic">No value set</span>
        )}
      </TableCell>
      <TableCell />
      <TableCell />
    </TableRow>
  );
}

export const VariableRow = ({
  variable,
  currentEnvironment: _currentEnvironment,
  environments = [],
}: VariableRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const { deleteEnvironmentVariable, isPending: isDeleting } = useDeleteEnvironmentVariable();

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  const filledCount = variable.values.filter((v) => v.value).length;
  const totalCount = environments.length;

  const handleDelete = async () => {
    await deleteEnvironmentVariable({ variableKey: variable.key });
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <TableRow
        className="group/row relative isolate cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        onKeyDown={handleRowKeyDown}
      >
        <VariableCell>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <RiArrowDownSLine className="text-text-sub size-4 shrink-0" />
            ) : (
              <RiArrowRightSLine className="text-text-sub size-4 shrink-0" />
            )}
            <span className="font-code text-text-strong max-w-[200px] truncate text-sm font-medium">
              {variable.key}
            </span>
            {variable.isSecret && (
              <span className="bg-feature/10 text-feature rounded px-1.5 py-0.5 text-xs font-medium">Secret</span>
            )}
          </div>
        </VariableCell>
        <VariableCell>
          <div className="flex items-center gap-2">
            {totalCount > 0 && <CoverageBadge filledCount={filledCount} totalCount={totalCount} />}
          </div>
        </VariableCell>
        <VariableCell>
          {variable.updatedAt && (
            <TimeDisplayHoverCard date={variable.updatedAt}>
              {formatDateSimple(variable.updatedAt)}
            </TimeDisplayHoverCard>
          )}
        </VariableCell>
        <VariableCell className="flex w-1 items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={stopPropagation}>
              <CompactButton icon={RiMore2Fill} variant="ghost" className="z-10 h-8 w-8 p-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" onClick={stopPropagation}>
              <DropdownMenuGroup>
                <Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setTimeout(() => setIsEditDrawerOpen(true), 0)}
                  >
                    <RiEditLine />
                    Edit variable
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={() => setTimeout(() => setIsDeleteModalOpen(true), 0)}
                  >
                    <RiDeleteBin2Line />
                    Delete variable
                  </DropdownMenuItem>
                </Protect>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </VariableCell>
      </TableRow>
      {isExpanded &&
        environments.map((env) => <EnvironmentSubRow key={env._id} variable={variable} environment={env} />)}
      <UpsertVariableDrawer variable={variable} isOpen={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen} />
      <DeleteVariableDialog
        variable={variable}
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
};

export const VariableRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-5 w-40" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-32" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-28" />
    </TableCell>
    <TableCell>
      <Skeleton className="ml-auto h-8 w-8" />
    </TableCell>
  </TableRow>
);
