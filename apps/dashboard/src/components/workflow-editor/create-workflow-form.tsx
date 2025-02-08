import {
  Form,
  FormControl,
  FormField,
  FormInput,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/primitives/form/form';
import { Separator } from '@/components/primitives/separator';
import { TagInput } from '@/components/primitives/tag-input';
import { Textarea } from '@/components/primitives/textarea';
import { useTags } from '@/hooks/use-tags';
import { zodResolver } from '@hookform/resolvers/zod';
import { type CreateWorkflowDto, slugify } from '@novu/shared';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { MAX_DESCRIPTION_LENGTH, MAX_TAG_ELEMENTS, workflowSchema } from './schema';

interface CreateWorkflowFormProps {
  onSubmit: (values: z.infer<typeof workflowSchema>) => void;
  template?: CreateWorkflowDto;
}

export function CreateWorkflowForm({ onSubmit, template }: CreateWorkflowFormProps) {
  const form = useForm<z.infer<typeof workflowSchema>>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      description: template?.description ?? '',
      workflowId: template?.workflowId ?? '',
      name: template?.name ?? '',
      tags: template?.tags ?? [],
    },
  });

  const { tags } = useTags();
  const tagSuggestions = tags.map((tag) => tag.name);

  return (
    <Form {...form}>
      <form
        id="create-workflow"
        autoComplete="off"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <FormInput
                  {...field}
                  autoFocus
                  onChange={(e) => {
                    field.onChange(e);
                    form.setValue('workflowId', slugify(e.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workflowId"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Identifier</FormLabel>
              <FormControl>
                <FormInput {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel optional hint={`(max. ${MAX_TAG_ELEMENTS})`}>
                  Add tags
                </FormLabel>
              </div>
              <FormControl>
                <TagInput
                  suggestions={tagSuggestions}
                  {...field}
                  value={field.value ?? []}
                  onChange={(tags) => {
                    field.onChange(tags);
                    form.setValue('tags', tags, { shouldValidate: true });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel optional>Description</FormLabel>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Describe what this workflow does"
                  {...field}
                  showCounter
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
