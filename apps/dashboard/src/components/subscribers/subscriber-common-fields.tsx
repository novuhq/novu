import React from 'react';
import { Tooltip, TooltipTrigger } from '../primitives/tooltip';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../primitives/form/form';
import { Link } from 'react-router-dom';
import { Input, InputRoot } from '../primitives/input';
import { PhoneInput } from '../primitives/phone-input';
import { Separator } from '@radix-ui/react-dropdown-menu';
import { LocaleSelect } from './locale-select';
import { TimezoneSelect } from './timezone-select';
import { Editor } from '../primitives/editor';
import { Button } from '../primitives/button';

export function SubscriberCommonFields() {
  return (
    <div>
      <div className="flex flex-col items-stretch gap-6 p-5">
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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

      <div className="mt-auto">
        <Separator />
        <div className="flex justify-between gap-3 p-3">
          =
          <Button
            variant="secondary"
            type="submit"
            disabled={!form.formState.isDirty || Object.keys(form.formState.dirtyFields).length === 0 || isPending}
          >
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
