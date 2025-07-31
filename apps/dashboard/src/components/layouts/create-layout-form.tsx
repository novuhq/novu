import { zodResolver } from '@hookform/resolvers/zod';
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

interface CreateLayoutFormProps {
  onSubmit: (formData: z.infer<typeof layoutSchema>) => void;
  template?: {
    name: string;
  };
}

export function CreateLayoutForm({ onSubmit, template }: CreateLayoutFormProps) {
  const form = useForm<z.infer<typeof layoutSchema>>({
    resolver: zodResolver(layoutSchema),
    defaultValues: {
      name: template?.name ?? '',
      layoutId: slugify(template?.name ?? ''),
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
      </FormRoot>
    </Form>
  );
}
