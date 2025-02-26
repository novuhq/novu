import { ConfirmationModal } from '@/components/confirmation-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
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
import { getSubscriberTitle } from '@/components/subscribers/utils';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import TruncatedText from '@/components/truncated-text';
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteSubscriber } from '@/hooks/use-delete-subscriber';
import { formatDateSimple } from '@/utils/format-date';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { SubscriberResponseDto } from '@novu/api/models/components';
import { ComponentProps, useState } from 'react';
import { RiDeleteBin2Line, RiFileCopyLine, RiMore2Fill, RiPulseFill } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalToast } from 'sonner';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

type SubscriberRowProps = {
  subscriber: SubscriberResponseDto;
};

type SubscriberLinkTableCellProps = ComponentProps<typeof TableCell>;

const SubscriberTableCell = (props: SubscriberLinkTableCellProps) => {
  const { children, className, ...rest } = props;

  return (
    <TableCell className={cn('group-hover:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
      {children}
      <span className="sr-only">Edit subscriber</span>
    </TableCell>
  );
};

export const SubscriberRow = ({ subscriber }: SubscriberRowProps) => {
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const subscriberTitle = getSubscriberTitle(subscriber);
  const editSubscriberLink = buildRoute(ROUTES.EDIT_SUBSCRIBER, {
    environmentSlug: currentEnvironment?.slug ?? '',
    subscriberId: subscriber.subscriberId,
  });

  const { deleteSubscriber, isPending: isDeleteSubscriberPending } = useDeleteSubscriber({
    onSuccess: () => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="success" />
            <span className="text-sm">
              Deleted subscriber <span className="font-bold">{subscriberTitle}</span>.
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
              Failed to delete subscriber <span className="font-bold">{subscriberTitle}</span>.
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
  });

  const stopPropagation = (e: React.MouseEvent) => {
    // don't propagate the click event to the row
    e.stopPropagation();
  };

  return (
    <>
      <TableRow
        key={subscriber.subscriberId}
        className="group relative isolate cursor-pointer"
        onClick={() => {
          navigate(editSubscriberLink);
        }}
      >
        <SubscriberTableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={subscriber.avatar || undefined} />
              <AvatarFallback>{subscriberTitle[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <TruncatedText className="text-text-strong max-w-[32ch] font-medium">{subscriberTitle}</TruncatedText>
              <div className="flex items-center gap-1 transition-opacity duration-200">
                <TruncatedText className="text-text-soft font-code block text-xs">
                  {subscriber.subscriberId}
                </TruncatedText>
                <CopyButton
                  className="z-10 flex size-2 p-0 px-1 opacity-0 group-hover:opacity-100"
                  valueToCopy={subscriber.subscriberId}
                  size="2xs"
                />
              </div>
            </div>
          </div>
        </SubscriberTableCell>
        <SubscriberTableCell>
          <TruncatedText className="relative z-10 max-w-[28ch]">{subscriber.email || '-'}</TruncatedText>
        </SubscriberTableCell>
        <SubscriberTableCell>{subscriber.phone || '-'}</SubscriberTableCell>
        <SubscriberTableCell>
          <TimeDisplayHoverCard date={new Date(subscriber.createdAt)}>
            {formatDateSimple(subscriber.createdAt)}
          </TimeDisplayHoverCard>
        </SubscriberTableCell>
        <SubscriberTableCell>
          <TimeDisplayHoverCard date={new Date(subscriber.updatedAt)}>
            {formatDateSimple(subscriber.updatedAt)}
          </TimeDisplayHoverCard>
        </SubscriberTableCell>
        <SubscriberTableCell className="w-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <CompactButton icon={RiMore2Fill} variant="ghost" className="z-10 h-8 w-8 p-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" onClick={stopPropagation}>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(subscriber.subscriberId);
                  }}
                >
                  <RiFileCopyLine />
                  Copy identifier
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    to={
                      buildRoute(ROUTES.ACTIVITY_FEED, {
                        environmentSlug: currentEnvironment?.slug ?? '',
                      }) +
                      '?' +
                      new URLSearchParams({ subscriberId: subscriber.subscriberId }).toString()
                    }
                  >
                    <RiPulseFill />
                    View activity
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => {
                    setTimeout(() => setIsDeleteModalOpen(true), 0);
                  }}
                >
                  <RiDeleteBin2Line />
                  Delete subscriber
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SubscriberTableCell>
      </TableRow>
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={async () => {
          await deleteSubscriber({ subscriberId: subscriber.subscriberId });
          setIsDeleteModalOpen(false);
        }}
        title={`Delete subscriber`}
        description={
          <span>
            Are you sure you want to delete subscriber{' '}
            <TruncatedText className="max-w-[20ch] font-bold">{subscriberTitle}</TruncatedText>? This action cannot be
            undone.
          </span>
        }
        confirmButtonText="Delete subscriber"
        isLoading={isDeleteSubscriberPending}
      />
    </>
  );
};

export const SubscriberRowSkeleton = () => {
  return (
    <TableRow className="group relative isolate">
      <TableCell className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-[20ch]" />
          <Skeleton className="h-3 w-[15ch] rounded-full" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[6ch] rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[8ch] rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[7ch] rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[14ch] rounded-full" />
      </TableCell>
      <TableCell className="w-1">
        <RiMore2Fill className="size-4 opacity-50" />
      </TableCell>
    </TableRow>
  );
};
