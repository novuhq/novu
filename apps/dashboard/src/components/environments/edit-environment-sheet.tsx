import { Button } from '@/components/primitives/button';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { ExternalLink } from '@/components/shared/external-link';
import { useUpdateEnvironment } from '@/hooks/use-environments';
import { zodResolver } from '@hookform/resolvers/zod';
import { IEnvironment } from '@novu/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiArrowRightSLine } from 'react-icons/ri';
import { z } from 'zod';
import { ColorPicker } from '../primitives/color-picker';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';

// TODO: Merge with CreateEnvironmentButton
const editEnvironmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().regex(/^\#[0-9a-fA-F]{6}$/, 'Enter a valid hex color, like #123456.'),
});

type EditEnvironmentFormData = z.infer<typeof editEnvironmentSchema>;

interface EditEnvironmentSheetProps {
  environment?: IEnvironment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditEnvironmentSheet = ({ environment, isOpen, onOpenChange }: EditEnvironmentSheetProps) => {
  const { mutateAsync: updateEnvironment, isPending } = useUpdateEnvironment();

  const form = useForm<EditEnvironmentFormData>({
    resolver: zodResolver(editEnvironmentSchema),
    defaultValues: {
      name: environment?.name || '',
      color: environment?.color,
    },
  });

  useEffect(() => {
    if (environment) {
      form.reset({
        name: environment.name,
        color: environment.color,
      });
    }
  }, [environment, form]);

  const onSubmit = async (values: EditEnvironmentFormData) => {
    if (!environment) return;

    try {
      await updateEnvironment({
        environment,
        name: values.name,
        color: values.color,
      });
      onOpenChange(false);
      form.reset();
      showSuccessToast('Environment updated successfully');
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Failed to update environment';
      showErrorToast(Array.isArray(message) ? message[0] : message);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Edit environment</SheetTitle>
          <div>
            <SheetDescription>
              Update your environment settings.{' '}
              <ExternalLink href="https://docs.novu.co/concepts/environments">Learn more</ExternalLink>
            </SheetDescription>
          </div>
        </SheetHeader>
        <Separator />
        <SheetMain>
          <Form {...form}>
            <form
              id="edit-environment"
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
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} pureInput={false} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetMain>
        <Separator />
        <SheetFooter>
          <Button
            isLoading={isPending}
            trailingIcon={RiArrowRightSLine}
            variant="secondary"
            mode="gradient"
            type="submit"
            form="edit-environment"
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
