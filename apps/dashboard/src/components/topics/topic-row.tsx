import { Skeleton } from '@/components/primitives/skeleton';
import { TableCell, TableRow } from '@/components/primitives/table';
import { format } from 'date-fns';
import { useState } from 'react';
import { RiDeleteBin2Line, RiEditLine } from 'react-icons/ri';
import { MoreOptions } from '../more-options';
import { useTopicsNavigate } from './hooks/use-topics-navigate';
import { Topic } from './types';

interface TopicRowProps {
  topic: Topic;
  topicsCount: number;
  firstTwoTopicsInternalIds: string[];
}

export const TopicRow = ({ topic, topicsCount, firstTwoTopicsInternalIds }: TopicRowProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { navigateToEditTopicPage } = useTopicsNavigate();
  const isFirstTwoTopics = firstTwoTopicsInternalIds.includes(topic._id);

  const createdAt = topic.createdAt ? format(new Date(topic.createdAt), 'dd/MM/yyyy HH:mm') : '-';
  const updatedAt = topic.updatedAt ? format(new Date(topic.updatedAt), 'dd/MM/yyyy HH:mm') : '-';

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          <span className="max-w-[300px] truncate">{topic.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-[300px] truncate">{topic.key}</div>
      </TableCell>
      <TableCell>{createdAt}</TableCell>
      <TableCell>{updatedAt}</TableCell>
      <TableCell className="flex justify-end">
        <MoreOptions
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          align="end"
          items={[
            {
              type: 'link',
              icon: <RiEditLine size={16} />,
              label: 'Edit',
              onClick: () => navigateToEditTopicPage(topic._id),
            },
            {
              type: 'button',
              icon: <RiDeleteBin2Line size={16} />,
              label: 'Delete',
              className: 'text-destructive hover:text-destructive',
              disabled: topicsCount === 1,
              onClick: () => {
                // TODO: Add delete functionality
                console.log('Delete topic', topic._id);
              },
            },
          ]}
        />
      </TableCell>
    </TableRow>
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
      <TableCell />
    </TableRow>
  );
};
