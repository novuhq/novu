import { ConfirmationModal } from '@/components/confirmation-modal';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Skeleton } from '@/components/primitives/skeleton';
import { TableCell, TableRow } from '@/components/primitives/table';
import { QueryKeys } from '@/utils/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ComponentProps, useState } from 'react';
import { RiDeleteBin2Line, RiFileCopyLine, RiMore2Fill } from 'react-icons/ri';
import { cn } from '../../utils/ui';
import { useDeleteTopic } from './hooks/use-delete-topic';
import { useTopicsNavigate } from './hooks/use-topics-navigate';
import { Topic } from './types';

interface TopicRowProps {
  topic: Topic;
  topicsCount: number;
}

type TopicTableCellProps = ComponentProps<typeof TableCell>;

const TopicTableCell = (props: TopicTableCellProps) => {
  const { children, className, ...rest } = props;

  return (
    <TableCell className={cn('group-hover:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
      {children}
      <span className="sr-only">Edit topic</span>
    </TableCell>
  );
};

export const TopicRow = ({ topic, topicsCount }: TopicRowProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { deleteTopic, isDeleting } = useDeleteTopic();
  const queryClient = useQueryClient();
  const { navigateToEditTopicPage } = useTopicsNavigate();

  const createdAt = topic.createdAt ? format(new Date(topic.createdAt), 'dd/MM/yyyy HH:mm') : '-';
  const updatedAt = topic.updatedAt ? format(new Date(topic.updatedAt), 'dd/MM/yyyy HH:mm') : '-';

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleDeletion = async () => {
    await deleteTopic(topic.key);

    // Close the delete modal
    setIsDeleteModalOpen(false);

    // Force a refetch of the topics list
    queryClient.invalidateQueries({
      queryKey: [QueryKeys.fetchTopics],
    });
  };

  return (
    <>
      <TableRow
        className="group relative isolate cursor-pointer"
        onClick={() => {
          navigateToEditTopicPage(topic.key);
        }}
      >
        <TopicTableCell>
          <div className="flex items-center">
            <span className="max-w-[300px] truncate font-medium">{topic.name}</span>
          </div>
        </TopicTableCell>
        <TopicTableCell>
          <div className="max-w-[300px] truncate">{topic.key}</div>
        </TopicTableCell>
        <TopicTableCell>{createdAt}</TopicTableCell>
        <TopicTableCell>{updatedAt}</TopicTableCell>
        <TopicTableCell className="w-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <CompactButton icon={RiMore2Fill} variant="ghost" className="z-10 h-8 w-8 p-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" onClick={stopPropagation}>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(topic.key);
                  }}
                >
                  <RiFileCopyLine />
                  Copy identifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => {
                    setTimeout(() => setIsDeleteModalOpen(true), 0);
                  }}
                >
                  <RiDeleteBin2Line />
                  Delete topic
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </TopicTableCell>
      </TableRow>
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeletion}
        title={`Delete topic`}
        description={
          <span>
            Are you sure you want to delete topic <span className="font-bold">{topic.name}</span>? This action cannot be
            undone.
          </span>
        }
        confirmButtonText="Delete topic"
        isLoading={isDeleting}
      />
    </>
  );
};

export const TopicRowSkeleton = () => {
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
