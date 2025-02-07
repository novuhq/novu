import { formatDateSimple } from '@/utils/format-date';
import { zodResolver } from '@hookform/resolvers/zod';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useForm } from 'react-hook-form';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { z } from 'zod';
import { Button } from '../primitives/button';
import { Editor } from '../primitives/editor';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../primitives/form/form';
import { Input, InputRoot } from '../primitives/input';
import { PhoneInput } from '../primitives/phone-input';
import { Separator } from '../primitives/separator';
import { SubscriberFormSchema } from './schema';
import { TimezoneSelect } from './timezone-select';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { Link, useBlocker, useNavigate } from 'react-router-dom';
import { usePatchSubscriber } from '@/hooks/use-patch-subscriber';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { CopyButton } from '../primitives/copy-button';
import { SubscriberOverviewSkeleton } from './subscriber-overview-skeleton';
import { LocaleSelect } from './locale-select';
import { useState } from 'react';
import { useDeleteSubscriber } from '@/hooks/use-delete-subscriber';
import { getSubscriberTitle } from './utils';
import { ConfirmationModal } from '../confirmation-modal';
import { ExternalToast } from 'sonner';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { UnsavedChangesAlertDialog } from '../unsaved-changes-alert-dialog';

const extensions = [loadLanguage('json')?.extension ?? []];
const basicSetup = { lineNumbers: true, defaultKeymap: true };
const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

export function SubscriberOverviewForm({ subscriberId }: { subscriberId: string }) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { data: subscriber, isPending } = useFetchSubscriber({ subscriberId });

  const { deleteSubscriber, isPending: isDeleteSubscriberPending } = useDeleteSubscriber({
    onSuccess: () => {
      showSuccessToast(
        `Deleted subscriber: ${subscriberDetails && getSubscriberTitle(subscriberDetails)}`,
        undefined,
        toastOptions
      );
    },
    onError: () => {
      showErrorToast('Failed to delete subscriber', undefined, toastOptions);
    },
  });

  const navigate = useNavigate();
  /**
   * Needed to forcefully reset the form when switching subscriber
   * Without this, the form will keep the previous subscriber's data for undefined fields of current one
   */
  const subscriberDetails = isPending ? undefined : subscriber;

  const form = useForm<z.infer<typeof SubscriberFormSchema>>({
    values: { ...subscriberDetails, data: JSON.stringify(subscriberDetails?.data, null, 2) ?? '' },
    resolver: zodResolver(SubscriberFormSchema),
    shouldFocusError: false,
  });

  const { patchSubscriber } = usePatchSubscriber({
    onSuccess: (data) => {
      showSuccessToast(
        `Updated subscriber: ${subscriberDetails && getSubscriberTitle(subscriberDetails)}`,
        undefined,
        toastOptions
      );
      form.reset({ ...data, data: JSON.stringify(data.data, null, 2) });
    },
    onError: () => {
      showErrorToast('Failed to update subscriber', undefined, toastOptions);
    },
  });

  const isDirty = Object.keys(form.formState.dirtyFields).length > 0;
  const blocker = useBlocker(isDirty);
  useBeforeUnload(isDirty);

  console.log({
    isDirty,
    isPending,
    dirt: form.formState.dirtyFields,
    d: form.formState.isDirty,
  });

  if (isPending || !subscriberDetails) {
    return <SubscriberOverviewSkeleton />;
  }

  const onSubmit = async (formData: z.infer<typeof SubscriberFormSchema>) => {
    const dirtyFields = form.formState.dirtyFields;

    const dirtyPayload = Object.keys(dirtyFields).reduce<Partial<typeof formData>>((acc, key) => {
      const typedKey = key as keyof typeof formData;
      if (typedKey === 'data') {
        const data = JSON.parse(JSON.stringify(formData.data));
        return { ...acc, data: data === '' ? {} : data };
      }
      return { ...acc, [typedKey]: formData[typedKey]?.trim() };
    }, {});

    if (!Object.keys(dirtyPayload).length) {
      return;
    }

    await patchSubscriber({ subscriberId, subscriber: dirtyPayload });
  };

  return (
    <div className="flex h-full flex-col">
      <Form {...form}>
        <form autoComplete="off" noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex flex-col items-stretch gap-6 p-5">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Avatar className="size-[3.75rem] cursor-default">
                    <AvatarImage src={subscriber?.avatar || undefined} />
                    <AvatarFallback className="bg-neutral-alpha-100">
                      <Avatar className="size-full">
                        <AvatarImage src="/images/avatar.svg" />
                      </Avatar>
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  Subscriber profile Image can only be updated via API
                </TooltipContent>
              </Tooltip>
              <div className="flex flex-1 items-center gap-2.5">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <FormItem className="w-full">
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={field.name}
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
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <FormItem className="w-full">
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={field.name}
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
              </div>
            </div>
            <div>
              <FormItem className="w-full">
                <div className="flex items-center">
                  <FormLabel
                    tooltip="Provide a unique ID for the user as the subscriberId (e.g., your app's internal user ID)."
                    className="gap-1"
                  >
                    SubscriberId
                  </FormLabel>
                  <span className="ml-auto">
                    <Link
                      to="https://docs.novu.co/concepts/subscribers"
                      className="text-xs font-medium text-neutral-600 hover:underline"
                      target="_blank"
                    >
                      How it works?
                    </Link>
                  </span>
                </div>
                <Input
                  value={subscriberId}
                  readOnly
                  trailingNode={
                    <CopyButton valueToCopy={subscriberId} className="group-has-[input:focus]:border-l-stroke-strong" />
                  }
                  size="xs"
                />
              </FormItem>
            </div>
            <div className="flex flex-1 items-center gap-2.5">
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem className="w-full">
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder={field.name}
                        id={field.name}
                        value={field.value || undefined}
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
                name="phone"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} placeholder={field.name} id={field.name} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />

            <div className="flex flex-1 items-center gap-2.5">
              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem className="w-1/5">
                    <FormLabel>Locale</FormLabel>
                    <FormControl>
                      <LocaleSelect value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-1">
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <TimezoneSelect value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="data"
              render={({ field, fieldState }) => (
                <FormItem className="w-full">
                  <FormLabel tooltip="Store additional user info as key-value pairs, like address, height, or nationality, in the data field.">
                    Custom data (JSON)
                  </FormLabel>
                  <FormControl>
                    <InputRoot hasError={!!fieldState.error} className="h-32 p-1 py-2">
                      <Editor
                        lang="json"
                        className="overflow-auto"
                        extensions={extensions}
                        basicSetup={basicSetup}
                        placeholder="Custom data (JSON)"
                        height="100%"
                        multiline
                        {...field}
                        value={field.value}
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
          </div>
          <Separator />
          {subscriberDetails?.updatedAt && (
            <span className="text-2xs px-5 py-1 text-neutral-400">
              Updated at{' '}
              {formatDateSimple(subscriberDetails?.updatedAt, {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC',
              })}{' '}
              UTC
            </span>
          )}

          <div className="mt-auto">
            <Separator />
            <div className="flex justify-between gap-3 p-3">
              <Button
                variant="primary"
                mode="ghost"
                leadingIcon={RiDeleteBin2Line}
                onClick={() => setIsDeleteModalOpen(true)}
              >
                Delete subscriber
              </Button>
              <Button
                variant="secondary"
                type="submit"
                disabled={!form.formState.isDirty || Object.keys(form.formState.dirtyFields).length === 0 || isPending}
              >
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </Form>
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={async () => {
          await deleteSubscriber({ subscriberId: subscriberDetails.subscriberId });
          setIsDeleteModalOpen(false);
          navigate('../', { relative: 'path' });
        }}
        title={`Delete subscriber`}
        description={
          <span>
            Are you sure you want to delete subscriber{' '}
            <span className="font-bold">{getSubscriberTitle(subscriberDetails!)}</span>? This action cannot be undone.
          </span>
        }
        confirmButtonText="Delete subscriber"
        isLoading={isDeleteSubscriberPending}
      />
      <UnsavedChangesAlertDialog blocker={blocker} />
    </div>
  );
}
