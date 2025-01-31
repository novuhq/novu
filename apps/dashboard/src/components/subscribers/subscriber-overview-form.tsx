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
import { Link } from 'react-router-dom';
import { usePatchSubscriber } from '@/hooks/use-patch-subscriber';
import { showSuccessToast } from '../primitives/sonner-helpers';
import { SubscriberResponseDto } from '@novu/api/models/components';
import { CopyButton } from '../primitives/copy-button';
import { SubscriberOverviewSkeleton } from './subscriber-overview-skeleton';

const extensions = [loadLanguage('json')?.extension ?? []];
const basicSetup = { lineNumbers: true, defaultKeymap: true };

export default function SubscriberOverviewForm({
  subscriberId,
  subscriber,
  isFetching,
}: {
  subscriberId: string;
  subscriber?: SubscriberResponseDto;
  isFetching: boolean;
}) {
  const { patchSubscriber } = usePatchSubscriber({
    onSuccess: () => {
      showSuccessToast('Subscriber updated successfully');
    },
  });

  /**
   * Needed to forcefully reset the form when switching subscriber
   * Without this, the form will keep the previous subscriber's data for undefined fields of current one
   */
  const subscriberDetails = isFetching ? undefined : subscriber;

  const form = useForm<z.infer<typeof SubscriberFormSchema>>({
    values: { ...subscriberDetails, data: JSON.stringify(subscriberDetails?.data, null, 2) },
    resolver: zodResolver(SubscriberFormSchema),
    shouldFocusError: false,
  });

  if (isFetching) {
    return <SubscriberOverviewSkeleton />;
  }

  const onSubmit = async (formData: z.infer<typeof SubscriberFormSchema>) => {
    const dirtyFields = form.formState.dirtyFields;

    const dirtyPayload = Object.keys(dirtyFields).reduce<Partial<typeof formData>>((acc, key) => {
      const typedKey = key as keyof typeof formData;
      if (typedKey === 'data') {
        return { ...acc, data: JSON.parse(formData.data) };
      }
      return { ...acc, [typedKey]: formData[typedKey] };
    }, {});

    if (!Object.keys(dirtyPayload).length) {
      return;
    }

    await patchSubscriber({ subscriberId, subscriber: dirtyPayload });
  };

  return (
    <div className="flex h-full flex-col items-stretch">
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
                  <Avatar className="size-[3.75rem]">
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
                        />
                      </FormControl>
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
                        />
                      </FormControl>
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
                <Input value={subscriberId} readOnly trailingNode={<CopyButton valueToCopy={subscriberId} />} />
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
                      />
                    </FormControl>
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
                      <PhoneInput
                        {...field}
                        placeholder={field.name}
                        id={field.name}
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
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
                  <FormItem className="w-1/4">
                    <FormLabel>Locale</FormLabel>
                    <FormControl>
                      <TimezoneSelect {...field} value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <TimezoneSelect {...field} value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="data"
              render={({ field, fieldState }) => (
                <FormItem className="w-full">
                  <FormLabel>Custom data (JSON)</FormLabel>
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
                        value={field.value || ''}
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
              <Button type="submit" variant="primary" mode="ghost" leadingIcon={RiDeleteBin2Line}>
                Delete subscriber
              </Button>
              <Button
                variant="secondary"
                type="submit"
                disabled={!form.formState.isDirty || Object.keys(form.formState.dirtyFields).length === 0 || isFetching}
              >
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
