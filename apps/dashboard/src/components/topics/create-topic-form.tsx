import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/primitives/form/form';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useCreateTopic } from '@/hooks/use-create-topic';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ExternalToast } from 'sonner';
import { z } from 'zod';

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

type CreateTopicFormProps = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onSubmitStart?: () => void;
};

export const CreateTopicForm = (props: CreateTopicFormProps) => {
  const { onSuccess, onError, onSubmitStart } = props;
  const track = useTelemetry();

  const { createTopic, isPending } = useCreateTopic({
    onSuccess: (data) => {
      showSuccessToast(`Created topic: ${data.name}`, undefined, toastOptions);
      track(TelemetryEvent.TOPICS_PAGE_VISIT); // Using closest available event

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create topic';
      showErrorToast(errorMessage, undefined, toastOptions);

      if (onError && error instanceof Error) {
        onError(error);
      }
    },
  });

  const form = useForm<z.infer<typeof TopicFormSchema>>({
    defaultValues: {
      name: '',
      key: '',
    },
    resolver: zodResolver(TopicFormSchema),
    shouldFocusError: false,
    mode: 'onBlur',
  });

  const onSubmit = async (formData: z.infer<typeof TopicFormSchema>) => {
    if (onSubmitStart) {
      onSubmitStart();
    }

    await createTopic({
      topic: {
        name: formData.name.trim(),
        key: formData.key.trim(),
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Form {...form}>
        <FormRoot
          id="create-topic-form"
          autoComplete="off"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex h-full flex-col overflow-y-auto"
        >
          <div className="flex flex-col items-stretch gap-6 p-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-primary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Topic name"
                      id={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!fieldState.error}
                      size="xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="key"
              render={({ field, fieldState }) => (
                <FormItem className="w-full">
                  <div className="flex">
                    <FormLabel className="gap-1">
                      Topic Key <span className="text-primary">*</span>
                    </FormLabel>
                    <span className="ml-auto">
                      <Link
                        to="https://docs.novu.co/platform/topics"
                        className="text-xs font-medium text-neutral-600 hover:underline"
                        target="_blank"
                      >
                        How it works?
                      </Link>
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="my-topic-key"
                      id={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!fieldState.error}
                      size="xs"
                    />
                  </FormControl>
                  <FormMessage>Used to identify the topic in API calls</FormMessage>
                </FormItem>
              )}
            />
          </div>
          <Separator />
          <div className="p-5">
            <InlineToast
              description={
                <div className="flex flex-col gap-3">
                  <span className="text-xs text-neutral-600">
                    <strong>Tip:</strong> You can also create topics via API, or add subscribers to topics
                    programmatically.
                  </span>
                  <Link
                    to="https://docs.novu.co/platform/topics"
                    className="text-xs font-medium text-neutral-600 underline"
                    target="_blank"
                  >
                    Learn more
                  </Link>
                </div>
              }
              variant="success"
              className="border-neutral-100 bg-neutral-50"
            />
          </div>
        </FormRoot>
      </Form>
    </div>
  );
};
