import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { GetContextResponseDto } from '@novu/api/models/components';
import { ContextId, ContextType } from '@novu/shared';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { ExternalToast } from 'sonner';
import { z } from 'zod';
import { useContextsNavigate } from '@/components/contexts/hooks/use-contexts-navigate';
import { EditContextFormSchema } from '@/components/contexts/schema';
import { Button } from '@/components/primitives/button';
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
import { Input, InputRoot } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { useDeleteContext } from '@/hooks/use-delete-context';
import { useFetchContext } from '@/hooks/use-fetch-context';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useUpdateContext } from '@/hooks/use-update-context';
import { formatDateSimple } from '@/utils/format-date';
import { TelemetryEvent } from '@/utils/telemetry';
import { ConfirmationModal } from '../confirmation-modal';
import { Editor } from '../primitives/editor';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0 pointer-events-none',
  },
};

const extensions = [loadLanguage('json')?.extension ?? []];
const basicSetup = { lineNumbers: true, defaultKeymap: true };

type ContextOverviewProps = {
  type: ContextType;
  id: ContextId;
  readOnly?: boolean;
};

const ContextNotFound = () => {
  return (
    <div className="mt-[100px] flex h-full w-full flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-lg font-semibold">Context Not Found</h3>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          The context you are looking for does not exist or has been deleted.
        </p>
      </div>
    </div>
  );
};

export const ContextOverviewSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-4">
        <div>
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    </div>
  );
};

const ContextOverviewForm = ({ context, readOnly }: { context: GetContextResponseDto; readOnly: boolean }) => {
  const track = useTelemetry();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const formId = useId();
  const { navigateToContextsPage } = useContextsNavigate();

  const { updateContext, isPending: isUpdating } = useUpdateContext({
    onSuccess: () => {
      showSuccessToast(`Context updated successfully`, undefined, toastOptions);
      track(TelemetryEvent.CONTEXTS_PAGE_VISIT);
      setIsSubmitting(false);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update context';
      showErrorToast(errorMessage, undefined, toastOptions);
      setIsSubmitting(false);
    },
  });

  const { deleteContext, isPending: isDeleting } = useDeleteContext();

  const form = useForm({
    defaultValues: {
      data: context.data ? JSON.stringify(context.data, null, 2) : '{}',
    },
    resolver: standardSchemaResolver(EditContextFormSchema),
    shouldFocusError: false,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (formData: z.infer<typeof EditContextFormSchema>) => {
    setIsSubmitting(true);
    try {
      const parsedData = formData.data ? JSON.parse(formData.data) : {};

      await updateContext({
        type: context.type,
        id: context.id,
        data: parsedData && Object.keys(parsedData).length > 0 ? parsedData : {},
      });
    } catch {
      // Error is handled by the hook's onError callback
      setIsSubmitting(false);
    }
  };

  const handleDeleteContext = async () => {
    try {
      await deleteContext({
        type: context.type,
        id: context.id,
      });
      showSuccessToast(`Deleted context: ${context.id}`, undefined, toastOptions);
      setIsDeleteModalOpen(false);
      navigateToContextsPage();
    } catch {
      // Error is handled by the hook's onError callback
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <Form {...form}>
          <FormRoot
            id={formId}
            autoComplete="off"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Context ID - Non-editable with copy button */}
            <FormItem>
              <FormLabel>Context ID</FormLabel>
              <Input
                value={context.id || 'No ID'}
                readOnly
                disabled
                className="disabled:text-neutral-900"
                size="xs"
                trailingNode={<CopyButton valueToCopy={context.id} />}
              />
            </FormItem>

            {/* Context Type - Non-editable */}
            <FormItem>
              <FormLabel>Context type</FormLabel>
              <Input
                value={context.type || 'No type'}
                readOnly
                disabled
                className="disabled:text-neutral-900"
                size="xs"
              />
            </FormItem>

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
                        readOnly={readOnly}
                      />
                    </InputRoot>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRoot>
        </Form>

        {/* Timestamp */}
        <div className="flex flex-col gap-1">
          {context.updatedAt && (
            <div className="flex justify-between pt-2">
              <span className="text-2xs text-neutral-400">
                <TimeDisplayHoverCard date={context.updatedAt}>
                  Updated at {formatDateSimple(context.updatedAt)}
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
              Delete context
            </Button>
            <Button
              variant="secondary"
              type="submit"
              form={formId}
              disabled={!form.formState.isDirty}
              isLoading={isSubmitting || isUpdating}
            >
              Save changes
            </Button>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteContext}
        title="Delete context"
        description={
          <span>
            Are you sure you want to delete context <span className="font-bold">{context.id}</span>? This action cannot
            be undone.
          </span>
        }
        confirmButtonText="Delete context"
        isLoading={isDeleting}
      />
    </div>
  );
};

export const ContextOverview = (props: ContextOverviewProps) => {
  const { type, id, readOnly = false } = props;
  const { data, isPending, error } = useFetchContext({ type, id });

  if (isPending) {
    return <ContextOverviewSkeleton />;
  }

  if (error) {
    return <ContextNotFound />;
  }

  if (!data) {
    return <ContextOverviewSkeleton />;
  }

  return <ContextOverviewForm context={data} readOnly={readOnly} />;
};
