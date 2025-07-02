import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LayoutCreationSourceEnum, slugify } from '@novu/shared';

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
import { layoutSchema } from '@/components/layouts/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateLayout } from '@/hooks/use-create-layout';
import { TelemetryEvent } from '@/utils/telemetry';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useTelemetry } from '@/hooks/use-telemetry';

interface CreateLayoutFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onSubmitStart?: () => void;
}

export function CreateLayoutForm({ onSuccess, onError, onSubmitStart }: CreateLayoutFormProps) {
  const track = useTelemetry();
  const { createLayout } = useCreateLayout({
    onSuccess: () => {
      showSuccessToast(`Layout created successfully`);
      track(TelemetryEvent.LAYOUTS_PAGE_VISIT); // Using closest available event

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create layout';
      showErrorToast(errorMessage);

      if (onError && error instanceof Error) {
        onError(error);
      }
    },
  });

  const form = useForm<z.infer<typeof layoutSchema>>({
    resolver: zodResolver(layoutSchema),
    defaultValues: {
      name: '',
      layoutId: '',
    },
  });

  const onSubmit = async (formData: z.infer<typeof layoutSchema>) => {
    if (onSubmitStart) {
      onSubmitStart();
    }

    await createLayout({
      layoutId: formData.layoutId,
      name: formData.name,
      __source: LayoutCreationSourceEnum.DASHBOARD,
    });
  };

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
