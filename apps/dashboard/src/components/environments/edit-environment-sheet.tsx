/**
 * biome-ignore-all lint/correctness/useUniqueElementIds: expected
 */
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { IEnvironment } from '@novu/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
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
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { EnvironmentFormData, EnvironmentFormFields, environmentFormSchema } from './environment-form';

interface EditEnvironmentSheetProps {
  environment?: IEnvironment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditEnvironmentSheet = ({ environment, isOpen, onOpenChange }: EditEnvironmentSheetProps) => {
  const { mutateAsync: updateEnvironment, isPending } = useUpdateEnvironment();

  const form = useForm<EnvironmentFormData>({
    resolver: standardSchemaResolver(environmentFormSchema),
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

  const onSubmit = async (values: EnvironmentFormData) => {
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
              <ExternalLink href="https://docs.novu.co/platform/developer/environments">Learn more</ExternalLink>
            </SheetDescription>
          </div>
        </SheetHeader>
        <Separator />
        <SheetMain>
          <Form {...form}>
            <FormRoot
              id="edit-environment"
              autoComplete="off"
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <EnvironmentFormFields form={form} />
            </FormRoot>
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
