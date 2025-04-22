import { useTopicsNavigate } from '@/components/topics/hooks/use-topics-navigate';
import { TopicDrawer } from '@/components/topics/topic-drawer';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export const EditTopicPage = () => {
  const { topicKey } = useParams<{ topicKey: string }>();
  const [open, setOpen] = useState(true);
  const { navigateToTopicsPage } = useTopicsNavigate();

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigateToTopicsPage();
    },
    condition: !open,
  });

  if (!topicKey) {
    return null;
  }

  return <TopicDrawer ref={unmountRef} open={open} onOpenChange={setOpen} topicKey={topicKey} />;
};
