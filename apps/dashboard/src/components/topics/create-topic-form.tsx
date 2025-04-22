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
import { InlineToast } from '@/components/primitives/inline-toast';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useCreateTopic } from '@/hooks/use-create-topic';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
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
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const [keyModifiedByUser, setKeyModifiedByUser] = useState(false);

  const { createTopic, isPending } = useCreateTopic({
    onSuccess: (data) => {
      showSuccessToast(`Topic created successfully`);
      track(TelemetryEvent.TOPICS_PAGE_VISIT); // Using closest available event

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create topic';
      showErrorToast(errorMessage);

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

  useEffect(() => {
    // Auto-focus the name input field when the component mounts
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Watch the name field and update the key field accordingly
  const watchedName = form.watch('name');
  const watchedKey = form.watch('key');

  useEffect(() => {
    // Only auto-update the key if it hasn't been modified by the user
    if (!keyModifiedByUser && watchedName) {
      const slugifiedKey = slugify(watchedName);
      form.setValue('key', slugifiedKey, { shouldValidate: true });
    }
  }, [watchedName, form, keyModifiedByUser]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent the form from submitting when pressing Enter in the input fields
    // We'll handle the submission in the form's onSubmit
    if (e.key === 'Enter') {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
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
                      onChange={(e) => {
                        field.onChange(e);
                      }}
                      hasError={!!fieldState.error}
                      size="xs"
                      ref={(element) => {
                        field.ref(element);
                        nameInputRef.current = element;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          keyInputRef.current?.focus();
                        } else if (e.key === 'Enter') {
                          handleKeyDown(e);
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
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="my-topic-key"
                        id={field.name}
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e);
                          // Mark that the user has modified the key field
                          setKeyModifiedByUser(true);
                        }}
                        hasError={!!fieldState.error}
                        size="xs"
                        ref={(element) => {
                          field.ref(element);
                          keyInputRef.current = element;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleKeyDown(e);
                          }
                        }}
                      />
                    </FormControl>
                    {watchedKey && (
                      <div
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={(e) => {
                          // Prevent the click from submitting the form
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <CopyButton valueToCopy={watchedKey} size="xs" className="ml-1" />
                      </div>
                    )}
                  </div>
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
