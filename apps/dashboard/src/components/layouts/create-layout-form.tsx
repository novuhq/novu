/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { slugify } from '@novu/shared';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { layoutSchema } from '@/components/layouts/schema';
import {
  Form,
  FormControl,
  FormField,
  FormInput,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/primitives/form/form';
import { TranslationToggleSection } from '../workflow-editor/translation-toggle-section';

interface CreateLayoutFormProps {
  onSubmit: (formData: z.infer<typeof layoutSchema>) => void;
  template?: {
    name: string;
    isTranslationEnabled?: boolean;
  };
}

export function CreateLayoutForm({ onSubmit, template }: CreateLayoutFormProps) {
  const form = useForm({
    resolver: standardSchemaResolver(layoutSchema),
    defaultValues: {
      name: template?.name ?? '',
      layoutId: slugify(template?.name ?? ''),
      isTranslationEnabled: template?.isTranslationEnabled ?? false,
    },
  });

  return (
    <Form {...form}>
      <FormRoot
        id="create-layout"
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
              <FormLabel required>Layout name</FormLabel>
              <FormControl>
                <FormInput
                  {...field}
                  autoFocus
                  onChange={(e) => {
                    field.onChange(e);
                    form.setValue('layoutId', slugify(e.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="layoutId"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Identifier</FormLabel>
              <FormControl>
                <FormInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isTranslationEnabled"
          render={({ field }) => (
            <TranslationToggleSection value={field.value ?? false} showManageLink={false} onChange={field.onChange} />
          )}
        />
      </FormRoot>
    </Form>
  );
}
