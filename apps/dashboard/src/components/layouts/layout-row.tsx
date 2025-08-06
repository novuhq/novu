import { EnvironmentTypeEnum, LayoutResponseDto, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import { ComponentProps, useState } from 'react';
import { RiDeleteBin2Line, RiFileCopyLine, RiMore2Fill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { type ExternalToast } from 'sonner';
import { DeleteLayoutDialog } from '@/components/layouts/delete-layout-dialog';
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
import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { TableCell, TableRow } from '@/components/primitives/table';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import TruncatedText from '@/components/truncated-text';
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteLayout } from '@/hooks/use-delete-layout';
import { formatDateSimple } from '@/utils/format-date';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { Badge } from '../primitives/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isDuplicable =
    layout.origin === ResourceOriginEnum.NOVU_CLOUD && currentEnvironment?.type === EnvironmentTypeEnum.DEV;

  const { deleteLayout, isPending: isDeleteLayoutPending } = useDeleteLayout({
    onSuccess: () => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="success" />
            <span className="text-sm">
              Deleted layout <span className="font-bold">{layout.name}</span>
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
    onError: () => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="error" />
            <span className="text-sm">
              Failed to delete layout <span className="font-bold">{layout.name}</span>
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
  });

  const onDeleteLayout = async () => {
    await deleteLayout({
      layoutSlug: layout.slug,
    });
  };

  const stopPropagation = (e: React.MouseEvent) => {
    // don't propagate the click event to the row
    e.stopPropagation();
  };

  return (
    <>
      <TableRow
        key={layout._id}
        className="group relative isolate cursor-pointer"
        onClick={() => {
          navigate(
            buildRoute(ROUTES.LAYOUTS_EDIT, {
              environmentSlug: currentEnvironment?.slug ?? '',
              layoutSlug: layout.slug,
            })
          );
        }}
      >
        <LayoutTableCell>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <TruncatedText className="text-text-strong max-w-[36ch] font-medium">{layout.name}</TruncatedText>
                {layout.isDefault && (
                  <Badge variant="lighter" className="text-xs" size="md">
                    DEFAULT
                  </Badge>
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
        <Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
          <LayoutTableCell className="w-1">
            {currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild onClick={stopPropagation}>
                  <CompactButton variant="ghost" icon={RiMore2Fill} className="z-10 h-8 w-8 p-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" onClick={stopPropagation}>
                  <DropdownMenuGroup>
                    {isDuplicable && (
                      <DropdownMenuItem
                        onClick={() => {
                          navigate(
                            buildRoute(ROUTES.LAYOUTS_DUPLICATE, {
                              environmentSlug: currentEnvironment?.slug ?? '',
                              layoutId: layout.layoutId,
                            })
                          );
                        }}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <RiFileCopyLine className="h-4 w-4" />
                        <span>Duplicate layout</span>
                      </DropdownMenuItem>
                    )}
                    <Tooltip>
                      <TooltipTrigger className="w-full">
                        <DropdownMenuItem
                          onClick={() => {
                            setTimeout(() => setIsDeleteModalOpen(true), 0);
                          }}
                          className="text-destructive flex cursor-pointer items-center gap-2"
                          disabled={layout.isDefault}
                        >
                          <RiDeleteBin2Line className="h-4 w-4" />
                          <span>Delete layout</span>
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      {layout.isDefault && <TooltipContent>The default layout cannot be deleted.</TooltipContent>}
                    </Tooltip>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </LayoutTableCell>
        </Protect>
      </TableRow>
      <DeleteLayoutDialog
        layout={layout}
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={onDeleteLayout}
        isLoading={isDeleteLayoutPending}
      />
    </>
  );
};
