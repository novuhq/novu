import { Button } from '@/components/primitives/button';
import { RiHashtag } from 'react-icons/ri';
import { useTopicsNavigate } from './hooks/use-topics-navigate';

export const TopicListBlank = () => {
  const { navigateToCreateTopicPage } = useTopicsNavigate();

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="bg-primary-50 rounded-full p-3">
          <RiHashtag className="text-primary h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="text-foreground-950 text-lg font-medium">No topics created yet</h3>
        <p className="text-foreground-500">
          Topics allow you to organize your subscribers and send notifications to groups of subscribers at once.
        </p>
        <Button onClick={navigateToCreateTopicPage} variant="primary" className="mt-2">
          Create your first topic
        </Button>
      </div>
    </div>
  );
};
