import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ExternalToast } from 'sonner';
import { z } from 'zod';
import { NovuApiError } from '@/api/api.client';
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

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0 pointer-events-none',
  },
};

const TopicFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  key: z.string().min(1, 'Key is required'),
});

type CreateTopicFormProps = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onSubmitStart?: () => void;
};

// Converts a name to a slug (kebab-case)
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export const CreateTopicForm = (props: CreateTopicFormProps) => {
  const { onSuccess, onError, onSubmitStart } = props;
  const track = useTelemetry();
  const [keyModifiedByUser, setKeyModifiedByUser] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { createTopic } = useCreateTopic({
    onSuccess: () => {
      showSuccessToast(`Topic created successfully`, undefined, toastOptions);
      track(TelemetryEvent.TOPICS_PAGE_VISIT); // Using closest available event

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      // Check if it's a conflict error (topic already exists)
      if (error instanceof NovuApiError && error.status === 409) {
        // Set error on the key field specifically
        form.setError('key', {
          type: 'manual',
          message: 'A topic with this key already exists',
        });
      }

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
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Watch the name field and update the key field accordingly
  const watchedName = form.watch('name');

  useEffect(() => {
    // Only auto-update the key if it hasn't been modified by the user
    if (!keyModifiedByUser && watchedName) {
      const slugifiedKey = slugify(watchedName);
      form.setValue('key', slugifiedKey, { shouldValidate: true });
    }
  }, [watchedName, form, keyModifiedByUser]);

  // Auto-focus the name input when the form is mounted
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

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
                  <FormLabel htmlFor={field.name}>
                    Name <span className="text-primary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Topic name"
                      id={field.name}
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e);
                      }}
                      hasError={!!fieldState.error}
                      size="xs"
                      ref={nameInputRef}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          form.handleSubmit(onSubmit)();
                        }
                      }}
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
                    <FormLabel htmlFor={field.name} className="gap-1">
                      Topic Key <span className="text-primary">*</span>
                    </FormLabel>
                  </div>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="project:12345"
                        id={field.name}
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e);
                          // Mark that the user has modified the key field
                          setKeyModifiedByUser(true);
                        }}
                        hasError={!!fieldState.error}
                        size="xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            form.handleSubmit(onSubmit)();
                          }
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage>Used to identify the topic in API calls</FormMessage>
                </FormItem>
              )}
            />
          </div>
          <Separator />
        </FormRoot>
      </Form>
      <div className="p-5">
        <InlineToast
          description={
            <div className="flex flex-col gap-3">
              <span className="text-xs text-neutral-600">
                <strong>Tip:</strong> You can also create topics via API, or add subscribers to topics programmatically.
              </span>
              <Link
                to="https://docs.novu.co/platform/concepts/topics"
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
    </div>
  );
};
