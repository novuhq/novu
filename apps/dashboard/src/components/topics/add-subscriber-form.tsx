import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { useState } from 'react';
import { useAddTopicSubscribers } from './hooks/use-topic-subscribers';

type AddSubscriberFormProps = {
  topicKey: string;
  onSuccess?: () => void;
};

export function AddSubscriberForm({ topicKey, onSuccess }: AddSubscriberFormProps) {
  const [subscriberId, setSubscriberId] = useState('');
  const { mutate: addSubscribers, isPending } = useAddTopicSubscribers();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!subscriberId.trim()) return;

    addSubscribers(
      {
        topicKey,
        subscribers: [subscriberId.trim()],
      },
      {
        onSuccess: () => {
          setSubscriberId('');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Enter subscriberId to add to this topic"
        value={subscriberId}
        size="xs"
        onChange={(e) => setSubscriberId(e.target.value)}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={isPending || !subscriberId.trim()}
        variant="secondary"
        mode="outline"
        size="xs"
        className="shrink-0"
        isLoading={isPending}
      >
        Add
      </Button>
    </form>
  );
}
