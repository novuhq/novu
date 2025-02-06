import { zodResolver } from '@hookform/resolvers/zod';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../primitives/button';
import { Editor } from '../primitives/editor';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../primitives/form/form';
import { Input, InputRoot } from '../primitives/input';
import { PhoneInput } from '../primitives/phone-input';
import { Separator } from '../primitives/separator';
import { LocaleSelect } from './locale-select';
import { CreateSubscriberFormSchema } from './schema';
import { TimezoneSelect } from './timezone-select';
import { RiCloseLine, RiGroup2Line, RiInformationFill, RiMailLine } from 'react-icons/ri';
import TruncatedText from '../truncated-text';
import { CompactButton } from '../primitives/button-compact';
import { ExternalLink } from '../shared/external-link';
import { InlineToast } from '../primitives/inline-toast';

const extensions = [loadLanguage('json')?.extension ?? []];
const basicSetup = { lineNumbers: true, defaultKeymap: true };

export function CreateSubscriberForm() {
  const navigate = useNavigate();
  /**
   * Needed to forcefully reset the form when switching subscriber
   * Without this, the form will keep the previous subscriber's data for undefined fields of current one
   */

  const form = useForm<z.infer<typeof CreateSubscriberFormSchema>>({
    resolver: zodResolver(CreateSubscriberFormSchema),
    shouldFocusError: false,
  });

  const onSubmit = async (formData: z.infer<typeof CreateSubscriberFormSchema>) => {
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

    // await patchSubscriber({ subscriberId, subscriber: dirtyPayload });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b p-3">
        <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
          <RiGroup2Line className="size-5 p-0.5" />
          <TruncatedText className="flex-1">Add subscriber</TruncatedText>
        </div>
        <CompactButton
          icon={RiCloseLine}
          variant="ghost"
          className="ml-auto size-6"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('../', { relative: 'path' });
          }}
        >
          <span className="sr-only">Close</span>
        </CompactButton>
      </header>
      <Form {...form}>
        <form autoComplete="off" noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="flex flex-col items-stretch gap-6 p-5">
            <div className="flex flex-1 gap-2.5">
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
            <div>
              <FormField
                control={form.control}
                name="subscriberId"
                render={({ field, fieldState }) => (
                  <FormItem className="w-full">
                    <div className="flex">
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
                    <FormControl>
                      <Input
                        {...field}
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
            </div>
            <div className="flex flex-1 gap-2.5">
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
                        placeholder="hello@novu.co"
                        id={field.name}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        hasError={!!fieldState.error}
                        leadingIcon={RiMailLine}
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
                      <PhoneInput
                        {...field}
                        placeholder="Enter phone number"
                        id={field.name}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />

            <div className="flex flex-1 gap-2.5">
              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem className="w-1/5">
                    <FormLabel>Locale</FormLabel>
                    <FormControl>
                      <LocaleSelect {...field} value={field.value} onValueChange={field.onChange} />
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
                      <TimezoneSelect {...field} value={field.value} onValueChange={field.onChange} />
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
                    <InputRoot hasError={!!fieldState.error} className="h-36 p-1 py-2">
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
          <div className="p-5">
            <InlineToast
              description={
                <div className="flex flex-col gap-3">
                  <span className="text-xs text-neutral-600">
                    <strong>Tip:</strong> You can also Add subscriber via API, or create them on the fly when sending
                    notifications.
                  </span>
                  <ExternalLink className="text-xs text-neutral-600" variant="text">
                    Learn more
                  </ExternalLink>
                </div>
              }
              variant="success"
              className="border-neutral-100 bg-neutral-50"
            />
          </div>
          <div className="mt-auto">
            <Separator />
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="text-2xs flex items-center gap-1 text-neutral-600">
                <RiInformationFill className="size-4" />
                <span>
                  Looking for no-PII handling?{' '}
                  <ExternalLink className="text-2xs text-neutral-600" variant="text">
                    Learn more
                  </ExternalLink>
                </span>
              </div>

              <Button
                variant="secondary"
                type="submit"
                disabled={!form.formState.isDirty || Object.keys(form.formState.dirtyFields).length === 0}
              >
                Create subscriber
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
