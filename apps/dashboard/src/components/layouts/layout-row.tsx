import { ComponentProps } from 'react';
import { RiDeleteBin2Line, RiFileCopyLine, RiMore2Fill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { PermissionsEnum, LayoutResponseDto } from '@novu/shared';

import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Skeleton } from '@/components/primitives/skeleton';
import { TableCell, TableRow } from '@/components/primitives/table';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import TruncatedText from '@/components/truncated-text';
import { formatDateSimple } from '@/utils/format-date';
import { Protect } from '@/utils/protect';
import { cn } from '@/utils/ui';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useEnvironment } from '@/context/environment/hooks';

type LayoutRowProps = {
  layout: LayoutResponseDto;
};

const LayoutTableCell = ({ className, children, ...rest }: ComponentProps<typeof TableCell>) => (
  <TableCell className={cn('group-hover:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
    {children}
    <span className="sr-only">Edit layout</span>
  </TableCell>
);

export const LayoutRowSkeleton = () => (
  <TableRow>
    <LayoutTableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </LayoutTableCell>
    <LayoutTableCell>
      <Skeleton className="h-4 w-24" />
    </LayoutTableCell>
    <LayoutTableCell>
      <Skeleton className="h-4 w-24" />
    </LayoutTableCell>
    <LayoutTableCell>
      <Skeleton className="ml-auto h-8 w-8" />
    </LayoutTableCell>
  </TableRow>
);

export const LayoutRow = ({ layout }: LayoutRowProps) => {
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

  const stopPropagation = (e: React.MouseEvent) => {
    // don't propagate the click event to the row
    e.stopPropagation();
  };

  return (
    <TableRow
      key={layout._id}
      className="group relative isolate cursor-pointer"
      onClick={() => {
        navigate(
          buildRoute(ROUTES.LAYOUTS_EDIT, { environmentSlug: currentEnvironment?.slug ?? '', layoutSlug: layout.slug })
        );
      }}
    >
      <LayoutTableCell>
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <TruncatedText className="text-text-strong max-w-[36ch] font-medium">{layout.name}</TruncatedText>
              {layout.isDefault && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">Default</span>
              )}
            </div>
            <div className="flex items-center gap-1 transition-opacity duration-200">
              <TruncatedText className="text-text-soft font-code block max-w-[40ch] text-xs">
                {layout.layoutId}
              </TruncatedText>
              <CopyButton
                className="z-10 flex size-2 p-0 px-1 opacity-0 group-hover:opacity-100"
                valueToCopy={layout.layoutId}
                size="2xs"
              />
            </div>
          </div>
        </div>
      </LayoutTableCell>
      <LayoutTableCell>
        <TimeDisplayHoverCard date={new Date(layout.createdAt)}>
          {formatDateSimple(layout.createdAt)}
        </TimeDisplayHoverCard>
      </LayoutTableCell>
      <LayoutTableCell>
        <TimeDisplayHoverCard date={new Date(layout.updatedAt)}>
          {formatDateSimple(layout.updatedAt)}
        </TimeDisplayHoverCard>
      </LayoutTableCell>
      <Protect permission={PermissionsEnum.LAYOUT_WRITE}>
        <LayoutTableCell className="w-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={stopPropagation}>
              <CompactButton variant="ghost" icon={RiMore2Fill} className="z-10 h-8 w-8 p-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={stopPropagation} className="flex cursor-pointer items-center gap-2">
                  <RiFileCopyLine className="h-4 w-4" />
                  <span>Duplicate layout</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={stopPropagation}
                  className="text-destructive flex cursor-pointer items-center gap-2"
                >
                  <RiDeleteBin2Line className="h-4 w-4" />
                  <span>Delete layout</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </LayoutTableCell>
      </Protect>
    </TableRow>
  );
};
