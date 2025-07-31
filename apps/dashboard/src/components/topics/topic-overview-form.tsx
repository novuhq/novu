import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ExternalToast } from 'sonner';
import { z } from 'zod';
import { deleteTopic, updateTopic } from '@/api/topics';
import { Button } from '@/components/primitives/button';
import { Card, CardContent } from '@/components/primitives/card';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { useTopicsNavigate } from '@/components/topics/hooks/use-topics-navigate';
import { useEnvironment } from '@/context/environment/hooks';
import { useTelemetry } from '@/hooks/use-telemetry';
import { formatDateSimple } from '@/utils/format-date';
import { QueryKeys } from '@/utils/query-keys';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { ConfirmationModal } from '../confirmation-modal';
import { Topic } from './types';

const TopicFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  key: z.string().min(1, 'Key is required'),
});

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0 pointer-events-none',
  },
};

interface TopicOverviewFormProps {
  topic: Topic;
  readOnly?: boolean;
}

export function TopicOverviewForm({ topic, readOnly = false }: TopicOverviewFormProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const track = useTelemetry();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { navigateToTopicsPage } = useTopicsNavigate();

  const form = useForm<z.infer<typeof TopicFormSchema>>({
    defaultValues: {
      name: topic.name,
      key: topic.key,
    },
    resolver: zodResolver(TopicFormSchema),
    shouldFocusError: false,
  });

  useEffect(() => {
    if (topic) {
      form.reset({
        name: topic.name,
        key: topic.key,
      });
    }
  }, [topic, form]);

  const onSubmit = async (formData: z.infer<typeof TopicFormSchema>) => {
    if (!currentEnvironment) return;

    const dirtyFields = form.formState.dirtyFields;
    const dirtyPayload = Object.keys(dirtyFields).reduce<Partial<typeof formData>>((acc, key) => {
      const typedKey = key as keyof typeof formData;
      return { ...acc, [typedKey]: formData[typedKey].trim() };
    }, {});

    if (!Object.keys(dirtyPayload).length) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateTopic({
        environment: currentEnvironment,
        topicKey: topic.key,
        topic: dirtyPayload,
      });

      showSuccessToast(`Updated topic: ${formData.name}`, undefined, toastOptions);
      form.reset(formData);
      track(TelemetryEvent.SUBSCRIBER_EDITED);

      // Force a refetch of the topics list
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTopics],
        exact: false,
        refetchType: 'all',
      });

      // Also invalidate the specific topic query to refresh any open drawers
      queryClient.invalidateQueries({
        queryKey: ['topic', currentEnvironment._id, topic.key],
        exact: true,
      });
    } catch (error) {
      showErrorToast('Failed to update topic', undefined, toastOptions);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!currentEnvironment) return;

    setIsDeleting(true);

    try {
      await deleteTopic({
        environment: currentEnvironment,
        topicKey: topic.key,
      });

      showSuccessToast(`Deleted topic: ${topic.name}`, undefined, toastOptions);
      track(TelemetryEvent.SUBSCRIBER_DELETED);
      setIsDeleteModalOpen(false);

      // Force a refetch of the topics list with exact:false to ensure it works
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTopics],
        exact: false,
        refetchType: 'all',
      });

      navigateToTopicsPage();
    } catch (error) {
      showErrorToast('Failed to delete topic', undefined, toastOptions);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn('flex h-full flex-col')}>
      <Form {...form}>
        <FormRoot autoComplete="off" noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex flex-1 flex-col items-stretch overflow-y-auto">
            <div className="flex flex-col items-stretch gap-4 p-5">
              <FormItem className="w-full">
                <div className="flex items-center">
                  <FormLabel tooltip="Unique identifier for the topic used in API calls" className="gap-1">
                    Topic Key
                  </FormLabel>
                  <span className="ml-auto">
                    <Link
                      to="https://docs.novu.co/platform/concepts/topics"
                      className="text-xs font-medium text-neutral-600 hover:underline"
                      target="_blank"
                    >
                      How it works?
                    </Link>
                  </span>
                </div>
                <Input
                  value={topic.key}
                  size="xs"
                  className="disabled:text-neutral-900"
                  trailingNode={<CopyButton valueToCopy={topic.key} />}
                  readOnly
                  disabled
                />
              </FormItem>
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly={readOnly}
                        placeholder="Topic name"
                        id={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        hasError={!!fieldState.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <div className="flex flex-col gap-1">
              {topic.updatedAt && (
                <div className="flex justify-between px-5 pt-2">
                  <span className="text-2xs text-neutral-400">
                    <TimeDisplayHoverCard date={topic.updatedAt}>
                      Updated at {formatDateSimple(topic.updatedAt)}
                    </TimeDisplayHoverCard>
                  </span>
                </div>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="mt-auto">
              <Separator />
              <div className="flex justify-between gap-3 p-3.5">
                <Button
                  variant="primary"
                  mode="ghost"
                  leadingIcon={RiDeleteBin2Line}
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  Delete topic
                </Button>
                <Button variant="secondary" type="submit" disabled={!form.formState.isDirty} isLoading={isSubmitting}>
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </FormRoot>
      </Form>
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteTopic}
        title="Delete topic"
        description={
          <span>
            Are you sure you want to delete topic <span className="font-bold">{topic.name}</span>? This action cannot be
            undone.
          </span>
        }
        confirmButtonText="Delete topic"
        isLoading={isDeleting}
      />
    </div>
  );
}

export function TopicOverviewSkeleton() {
  return (
    <div className="p-4">
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center">
                <Skeleton className="h-4 w-20" />
                <div className="ml-auto">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
