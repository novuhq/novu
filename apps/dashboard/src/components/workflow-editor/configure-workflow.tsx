import { useFormContext } from 'react-hook-form';
import { RouteFill } from '../icons';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../primitives/form';
import { Input, InputField } from '../primitives/input';
import { Switch } from '../primitives/switch';
import { Textarea } from '../primitives/textarea';
import { TagInput } from '../primitives/tag-input';
import { Separator } from '../primitives/separator';

export function ConfigureWorkflow() {
  const { control } = useFormContext();
  return (
    <aside className="text-foreground-950 flex h-full w-[300px] max-w-[350px] flex-col border-l pb-5 pt-3.5">
      <div className="flex items-center gap-2.5 px-3 pb-2.5">
        <RouteFill />
        <span>Configure workflow</span>
      </div>
      <Separator />
      <FormField
        control={control}
        name="active"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-2.5 px-3 py-2">
            <FormLabel className="text-base">Active Workflow</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <Separator />
      <div className="flex flex-col gap-4 px-3 py-3">
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
          name="identifier"
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
          name="identifier"
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
                <FormMessage>(max. 8)</FormMessage>
              </div>
              <FormControl>
                <TagInput {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <Separator />
      <FormField
        control={control}
        name="active"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-2.5 px-3 py-2">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Mark as critical</FormLabel>
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
