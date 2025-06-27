import { ComponentProps } from 'react';
import { RiDeleteBin2Line, RiDownloadLine, RiMore2Fill, RiRouteFill, RiUploadLine } from 'react-icons/ri';
import { useNavigate, useParams } from 'react-router-dom';

import { buildRoute, ROUTES } from '@/utils/routes';

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
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import TruncatedText from '@/components/truncated-text';
import { formatDateSimple } from '@/utils/format-date';
import { cn } from '@/utils/ui';
import { TranslationGroup } from '@/api/translations';

type TranslationRowProps = {
  translation: TranslationGroup;
};

const TranslationTableCell = ({ className, children, ...rest }: ComponentProps<typeof TableCell>) => (
  <TableCell className={cn('group-hover:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
    {children}
    <span className="sr-only">Edit translation</span>
  </TableCell>
);

export const TranslationRowSkeleton = () => (
  <TableRow>
    <TranslationTableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="size-4" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </TranslationTableCell>
    <TranslationTableCell>
      <div className="flex gap-1">
        <Skeleton className="h-5 w-8 rounded-full" />
        <Skeleton className="h-5 w-8 rounded-full" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
    </TranslationTableCell>
    <TranslationTableCell>
      <Skeleton className="h-4 w-24" />
    </TranslationTableCell>
    <TranslationTableCell>
      <Skeleton className="h-4 w-24" />
    </TranslationTableCell>
    <TranslationTableCell>
      <Skeleton className="h-8 w-8" />
    </TranslationTableCell>
  </TableRow>
);

export const TranslationRow = ({ translation }: TranslationRowProps) => {
  const navigate = useNavigate();
  const { environmentSlug } = useParams<{ environmentSlug: string }>();

  const stopPropagation = (e: React.MouseEvent) => {
    // don't propagate the click event to the row
    e.stopPropagation();
  };

  const handleGoToWorkflow = (e: React.MouseEvent) => {
    stopPropagation(e);

    if (environmentSlug) {
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: environmentSlug,
          workflowSlug: translation.resourceId,
        })
      );
    }
  };

  return (
    <TableRow
      key={translation._id}
      className="group relative isolate cursor-pointer"
      onClick={() => {
        // TODO: Navigate to edit translation page when implemented
      }}
    >
      <TranslationTableCell className="flex items-center gap-2 font-medium">
        <Tooltip delayDuration={300}>
          <TooltipTrigger>
            <RiRouteFill className="text-feature size-4" />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              <span className="font-medium">Workflow Translation</span>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <div>
          <div className="flex items-center gap-1">
            <TruncatedText className="max-w-[32ch]">{translation.resourceName}</TruncatedText>
          </div>
          <div className="flex items-center gap-1 transition-opacity duration-200">
            <TruncatedText className="text-foreground-400 font-code block max-w-[40ch] text-xs">
              {translation.resourceId}
            </TruncatedText>
            <CopyButton
              className="z-10 flex size-2 p-0 px-1 opacity-0 group-hover:opacity-100"
              valueToCopy={translation.resourceId}
              size="2xs"
            />
          </div>
        </div>
      </TranslationTableCell>
      <TranslationTableCell>
        <div className="flex flex-wrap gap-1">
          {translation.locales.slice(0, 3).map((locale) => (
            <span
              key={locale}
              className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
            >
              {locale}
            </span>
          ))}
          {translation.locales.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
              +{translation.locales.length - 3}
            </span>
          )}
        </div>
      </TranslationTableCell>
      <TranslationTableCell>
        <TimeDisplayHoverCard date={new Date(translation.createdAt)}>
          {formatDateSimple(translation.createdAt)}
        </TimeDisplayHoverCard>
      </TranslationTableCell>
      <TranslationTableCell>
        <TimeDisplayHoverCard date={new Date(translation.updatedAt)}>
          {formatDateSimple(translation.updatedAt)}
        </TimeDisplayHoverCard>
      </TranslationTableCell>
      <TranslationTableCell>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={stopPropagation}>
              <CompactButton variant="ghost" icon={RiMore2Fill} className="z-10 h-8 w-8 p-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleGoToWorkflow} className="flex cursor-pointer items-center gap-2">
                  <RiRouteFill className="h-4 w-4" />
                  <span>Go to workflow</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={stopPropagation} className="flex cursor-pointer items-center gap-2">
                  <RiUploadLine className="h-4 w-4" />
                  <span>Import translations</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={stopPropagation} className="flex cursor-pointer items-center gap-2">
                  <RiDownloadLine className="h-4 w-4" />
                  <span>Export translations</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={stopPropagation}
                  className="text-destructive flex cursor-pointer items-center gap-2"
                >
                  <RiDeleteBin2Line className="h-4 w-4" />
                  <span>Disable & delete translation</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TranslationTableCell>
    </TableRow>
  );
};
