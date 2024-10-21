import { useFormContext } from 'react-hook-form';
import { RouteFill } from '../icons';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../primitives/form';
import { Input, InputField } from '../primitives/input';
import { Switch } from '../primitives/switch';
import { Textarea } from '../primitives/textarea';
import { TagInput } from '../primitives/tag-input';
import { Separator } from '../primitives/separator';
import { formSchema } from './schema';
import * as z from 'zod';
import { RiInformation2Line } from 'react-icons/ri';

import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../primitives/tooltip';
import { CopyButton } from '../primitives/copy-button';

export function ConfigureWorkflow() {
  const { control } = useFormContext<z.infer<typeof formSchema>>();
  return (
    <aside className="text-foreground-950 flex h-full w-[300px] max-w-[350px] flex-col border-l pb-5 pt-3.5 [&_input]:text-neutral-600 [&_label]:text-xs [&_label]:font-medium [&_textarea]:text-neutral-600">
      <div className="flex items-center gap-2.5 px-3 pb-3.5 text-sm font-medium">
        <RouteFill />
        <span>Configure workflow</span>
      </div>
      <Separator />
      <FormField
        control={control}
        name="active"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-2.5 space-y-0 px-3 py-2">
            <div className="flex items-center gap-4">
              <div
                className="bg-success-alpha-600 data-[active=false]:shadow-neutral-alpha-100 ml-2 h-1.5 w-1.5 rounded-full [--pulse-color:var(--success)] data-[active=true]:animate-[pulse-shadow_1s_ease-in-out_infinite] data-[active=false]:bg-neutral-300 data-[active=false]:shadow-[0_0px_0px_5px_var(--neutral-alpha-200),0_0px_0px_9px_var(--neutral-alpha-100)]"
                data-active={field.value}
              />
              <FormLabel>Active Workflow</FormLabel>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <Separator />
      <div className="flex flex-col gap-4 p-3">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workflow Name</FormLabel>
              <FormControl>
                <InputField>
                  <Input placeholder="Untitled" {...field} />
                </InputField>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="workflowId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workflow Identifier</FormLabel>
              <FormControl>
                <InputField className="flex overflow-hidden pr-0">
                  <Input placeholder="Untitled" {...field} />
                  <CopyButton
                    content={field.value}
                    className="rounded-md rounded-s-none border-b-0 border-r-0 border-t-0 text-neutral-400"
                  />
                </InputField>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Untitled" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Add tags</FormLabel>
              </div>
              <FormControl className="text-xs text-neutral-600">
                <TagInput {...field} value={field.value ?? []} showAddButton />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <Separator />
      <FormField
        control={control}
        name="preferences.default.all.readOnly"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-2.5 space-y-0 px-3 py-4">
            <div className="flex items-center gap-1">
              <FormLabel>Mark as critical</FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <RiInformation2Line className="text-foreground-400 cursor-pointer" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="w-72">
                    <span>Marking this workflow as critical will prevent subscribers from unsubscribing.</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <Separator />
    </aside>
  );
}
