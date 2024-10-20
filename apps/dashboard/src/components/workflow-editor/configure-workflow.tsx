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

export function ConfigureWorkflow() {
  const { control } = useFormContext<z.infer<typeof formSchema>>();
  return (
    <aside className="text-foreground-950 flex h-full w-[300px] max-w-[350px] flex-col border-l pb-5 pt-3.5 [&_label]:text-xs [&_label]:font-medium">
      <div className="flex items-center gap-2.5 px-3 pb-2.5 text-sm">
        <RouteFill />
        <span>Configure workflow</span>
      </div>
      <Separator />
      <FormField
        control={control}
        name="active"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-2.5 space-y-0 px-3 py-2">
            <div className="flex items-center gap-2">
              <div
                className="bg-success-alpha-600 shadow-success-alpha-200 data-[active=false]:shadow-neutral-alpha-100 h-1.5 w-1.5 rounded-full shadow-[0_0px_0px_2px_var(--success-alpha-200),0_0px_0px_4px_var(--success-alpha-100)] data-[active=false]:bg-neutral-300 data-[active=false]:shadow-[0_0px_0px_2px_var(--neutral-alpha-200),0_0px_0px_4px_var(--neutral-alpha-100)]"
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
              <FormControl>
                <TagInput {...field} value={field.value ?? []} />
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
