import { IEnvironment } from '@novu/shared';
import React, { useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine, RiCheckLine, RiCornerDownRightLine, RiLockLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { CopyButton } from '@/components/primitives/copy-button';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { TableCell, TableRow } from '@/components/primitives/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type CellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

const SystemVariableCell = ({ children, className, ...rest }: CellProps) => (
  <TableCell className={cn('group-hover/row:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
    {children}
  </TableCell>
);

type SystemVariableSubRowProps = {
  environment: IEnvironment;
  value: string;
};

const SystemVariableSubRow = ({ environment, value }: SystemVariableSubRowProps) => (
  <TableRow className="bg-neutral-alpha-25 hover:bg-neutral-alpha-50">
    <TableCell className="pl-8">
      <div className="flex items-center gap-2">
        <RiCornerDownRightLine className="text-text-disabled size-4 shrink-0" />
        <EnvironmentBranchIcon environment={environment} size="sm" />
        <span className="text-text-sub text-xs font-medium">{environment.name}</span>
      </div>
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-1">
        <span className="font-code text-text-strong max-w-[300px] truncate text-xs">{value}</span>
        <CopyButton valueToCopy={value} size="xs" className="p-1" />
      </div>
    </TableCell>
    <TableCell />
    <TableCell />
  </TableRow>
);

type SystemVariableRowProps = {
  variableKey: string;
  resolve: (env: IEnvironment) => string;
  environments: IEnvironment[];
};

export const SystemVariableRow = ({ variableKey, resolve, environments }: SystemVariableRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayKey = variableKey.split('.').at(-1) ?? variableKey;
  const totalCount = environments.length;

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: intentional interactive <tr> to match VariableRow pattern */}
      <TableRow
        className="group/row relative isolate cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        onKeyDown={handleRowKeyDown}
      >
        <SystemVariableCell>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <RiArrowDownSLine className="text-text-sub size-4 shrink-0" />
            ) : (
              <RiArrowRightSLine className="text-text-sub size-4 shrink-0" />
            )}
            <span className="font-code text-text-strong max-w-[200px] truncate text-sm font-medium">{displayKey}</span>
            <Badge variant="lighter" color="gray" size="sm">
              SYSTEM
            </Badge>
          </div>
        </SystemVariableCell>
        <SystemVariableCell>
          {totalCount > 0 && (
            <span className="bg-success/10 text-success-600 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium">
              <RiCheckLine className="size-3" />
              {totalCount}/{totalCount}
            </span>
          )}
        </SystemVariableCell>
        <SystemVariableCell>
          <span className="text-text-disabled text-xs">—</span>
        </SystemVariableCell>
        <SystemVariableCell className="flex w-1 items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-text-disabled inline-flex h-8 w-8 items-center justify-center rounded">
                <RiLockLine className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>System variable — read only</TooltipContent>
          </Tooltip>
        </SystemVariableCell>
      </TableRow>
      {isExpanded &&
        environments.map((env) => <SystemVariableSubRow key={env._id} environment={env} value={resolve(env)} />)}
    </>
  );
};
