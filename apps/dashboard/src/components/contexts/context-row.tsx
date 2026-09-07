import { GetContextResponseDto } from '@novu/api/models/components';
import { PermissionsEnum } from '@novu/shared';
import { ComponentProps, useState } from 'react';
import { RiDeleteBin2Line, RiMore2Fill, RiPulseFill } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ConfirmationModal } from '@/components/confirmation-modal';
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
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteContext } from '@/hooks/use-delete-context';
import { formatDateSimple } from '@/utils/format-date';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

type ContextRowProps = {
  context: GetContextResponseDto;
};

type ContextTableCellProps = ComponentProps<typeof TableCell> & {
  to?: string;
};

const ContextTableCell = (props: ContextTableCellProps) => {
  const { children, className, to, ...rest } = props;

  return (
    <TableCell className={cn('group-hover:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
      {to && (
        <Link to={to} className="absolute inset-0" tabIndex={-1}>
          <span className="sr-only">Edit context</span>
        </Link>
      )}
      {children}
    </TableCell>
  );
};

export const ContextRow = ({ context }: ContextRowProps) => {
  const { currentEnvironment } = useEnvironment();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { deleteContext, isPending: isDeleting } = useDeleteContext();

  const contextLink = buildRoute(ROUTES.CONTEXTS_EDIT, {
    environmentSlug: currentEnvironment?.slug ?? '',
    type: context.type,
    id: context.id,
  });

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleDeletion = async () => {
    try {
      await deleteContext({
        type: context.type,
        id: context.id,
      });
      setIsDeleteModalOpen(false);
    } catch {
      // Error is already handled by the useDeleteContext hook
    }
  };

  return (
    <>
      <TableRow
        className="group relative isolate cursor-pointer"
      >
        <ContextTableCell to={contextLink}>
          <span className="max-w-[300px] truncate font-medium">{context.type}</span>
        </ContextTableCell>
        <ContextTableCell to={contextLink}>
          <div className="flex items-center gap-1">
            <div className="font-code text-text-soft max-w-[300px] truncate">{context.id}</div>
            <CopyButton
              className="z-10 flex size-2 p-0 px-1 opacity-0 group-hover:opacity-100"
              valueToCopy={context.id}
              size="2xs"
            />
          </div>
        </ContextTableCell>
        <ContextTableCell to={contextLink}>
          {context.createdAt && (
            <TimeDisplayHoverCard date={context.createdAt}>{formatDateSimple(context.createdAt)}</TimeDisplayHoverCard>
          )}
        </ContextTableCell>
        <ContextTableCell to={contextLink}>
          {context.updatedAt && (
            <TimeDisplayHoverCard date={context.updatedAt}>{formatDateSimple(context.updatedAt)}</TimeDisplayHoverCard>
          )}
        </ContextTableCell>
        <ContextTableCell className="w-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <CompactButton
                icon={RiMore2Fill}
                variant="ghost"
                className="z-10 h-8 w-8 p-0"
                onClick={stopPropagation}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" onClick={stopPropagation}>
              <DropdownMenuGroup>
                <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link
                      to={
                        buildRoute(ROUTES.ACTIVITY_FEED, {
                          environmentSlug: currentEnvironment?.slug ?? '',
                        }) +
                        '?' +
                        new URLSearchParams({ contextKeys: `${context.type}:${context.id}` }).toString()
                      }
                    >
                      <RiPulseFill />
                      View activity
                    </Link>
                  </DropdownMenuItem>
                </Protect>
                <Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={() => {
                      setTimeout(() => setIsDeleteModalOpen(true), 0);
                    }}
                  >
                    <RiDeleteBin2Line />
                    Delete context
                  </DropdownMenuItem>
                </Protect>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ContextTableCell>
      </TableRow>
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeletion}
        title="Delete context"
        description={
          <span>
            Are you sure you want to delete context <span className="font-bold">{context.id}</span>? This action cannot
            be undone.
          </span>
        }
        confirmButtonText="Delete context"
        isLoading={isDeleting}
      />
    </>
  );
};

export const ContextRowSkeleton = () => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell className="w-1">
        <RiMore2Fill className="size-4 opacity-50" />
      </TableCell>
    </TableRow>
  );
};
