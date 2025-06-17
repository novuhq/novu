import { ISubscriberResponseDto } from '@novu/shared';
import { useState } from 'react';
import { RiAddFill } from 'react-icons/ri';
import { SubscriberAutocomplete } from '../subscribers/subscriber-autocomplete';
import { useAddTopicSubscribers } from './hooks/use-topic-subscribers';

type AddSubscriberFormProps = {
  topicKey: string;
  onSuccess?: () => void;
};

export function AddSubscriberForm({ topicKey, onSuccess }: AddSubscriberFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { mutate: addSubscribers, isPending } = useAddTopicSubscribers();

  const handleSubscriberSelected = (subscriber: ISubscriberResponseDto) => {
    if (!subscriber.subscriberId?.trim()) return;

    addSubscribers(
      {
        topicKey,
        subscribers: [subscriber.subscriberId.trim()],
      },
      {
        onSuccess: () => {
          setSearchQuery('');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <div className="w-full">
      <SubscriberAutocomplete
        value={searchQuery}
        onChange={setSearchQuery}
        onSelectSubscriber={handleSubscriberSelected}
        size="xs"
        className="w-full"
        isLoading={isPending}
        placeholder="Add subscriber to this topic"
        trailingIcon={RiAddFill}
      />
    </div>
  );
}
