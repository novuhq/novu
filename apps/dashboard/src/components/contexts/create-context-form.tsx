import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useEffect, useId, useRef } from 'react';
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
import { Input, InputRoot } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useCreateContext } from '@/hooks/use-create-context';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { Editor } from '../primitives/editor';
import { CreateContextFormSchema } from './schema';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0 pointer-events-none',
  },
};

const extensions = [loadLanguage('json')?.extension ?? []];
const basicSetup = { lineNumbers: true, defaultKeymap: true };

type CreateContextFormProps = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onSubmitStart?: () => void;
  formId?: string;
};

export const CreateContextForm = (props: CreateContextFormProps) => {
  const { onSuccess, onError, onSubmitStart, formId: providedFormId } = props;
  const track = useTelemetry();
  const idInputRef = useRef<HTMLInputElement>(null);
  const generatedFormId = useId();
  const formId = providedFormId ?? generatedFormId;

  const { createContext } = useCreateContext({
    onSuccess: () => {
      showSuccessToast(`Context created successfully`, undefined, toastOptions);
      track(TelemetryEvent.CONTEXTS_PAGE_VISIT);
      onSuccess?.();
    },
    onError: (error) => {
      if (error instanceof NovuApiError && error.status === 409) {
        form.setError('id', {
          type: 'manual',
          message: 'A context with this ID and type already exists',
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create context';
        showErrorToast(errorMessage, undefined, toastOptions);
      }

      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
  });

  const form = useForm({
    defaultValues: {
      id: '',
      type: '',
      data: '',
    },
    resolver: standardSchemaResolver(CreateContextFormSchema),
    shouldFocusError: false,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (idInputRef.current) {
      idInputRef.current.focus();
    }
  }, []);

  const onSubmit = async (formData: z.infer<typeof CreateContextFormSchema>) => {
    onSubmitStart?.();

    const parsedData = formData.data ? JSON.parse(formData.data) : {};

    await createContext({
      type: formData.type.trim(),
      id: formData.id.trim(),
      ...(parsedData && Object.keys(parsedData).length > 0 ? { data: parsedData } : {}),
    });
  };

  return (
    <>
      <Form {...form}>
        <FormRoot
          id={formId}
          autoComplete="off"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel htmlFor={field.name}>
                  Identifier <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="acme-org"
                    id={field.name}
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                    }}
                    hasError={!!fieldState.error}
                    size="xs"
                    ref={idInputRef}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                  />
                </FormControl>
                <FormMessage>Specific instance identifier (e.g., 123, acme)</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field, fieldState }) => (
              <FormItem className="w-full">
                <div className="flex">
                  <FormLabel htmlFor={field.name} className="gap-1">
                    Context type <span className="text-primary">*</span>
                  </FormLabel>
                </div>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="tenant"
                      id={field.name}
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e);
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
                <FormMessage>Context type for targeting (e.g., user, tenant, organization)</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data"
            render={({ field, fieldState }) => (
              <FormItem className="w-full">
                <FormLabel
                  tooltip={`Store additional context details as key-value pairs. This data can be used as variables in notification content, conditions etc.
                     \nExample: {\n "companyName": "Acme Inc",\n "plan": "enterprise"\n}`}
                >
                  Custom data (JSON)
                </FormLabel>
                <FormControl>
                  <InputRoot hasError={!!fieldState.error} className="h-36 p-1 py-2">
                    <Editor
                      lang="json"
                      className="h-full overflow-y-auto overflow-x-hidden [&_.cm-content]:max-w-[calc(100%-2rem)]"
                      extensions={extensions}
                      basicSetup={basicSetup}
                      placeholder="{}"
                      height="100%"
                      multiline
                      foldGutter
                      {...field}
                      value={field.value ?? ''}
                      onChange={(val) => {
                        field.onChange(val);
                        form.trigger(field.name);
                      }}
                    />
                  </InputRoot>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormRoot>
      </Form>
      <InlineToast
        description={
          <>
            <span className="text-xs text-neutral-600">
              <strong>Tip:</strong> Learn how to effectively use contexts to organize and personalize your
              notifications.{' '}
            </span>
            <Link
              to="https://docs.novu.co/platform/workflow/advanced-features/contexts"
              className="text-xs font-medium text-neutral-600 underline"
              target="_blank"
            >
              Learn more
            </Link>
          </>
        }
        variant="success"
        className="mt-6 border-neutral-100 bg-neutral-50"
      />
    </>
  );
};
