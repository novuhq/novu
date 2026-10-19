/**
 * biome-ignore-all lint/correctness/useUniqueElementIds: expected
 */
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { type IEnvironment, PermissionsEnum } from '@novu/shared';
import { type ComponentProps, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiAddLine, RiArrowRightSLine, RiDatabase2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { PermissionButton } from '@/components/primitives/permission-button';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetMain, SheetTitle } from '@/components/primitives/sheet';
import { useAuth } from '@/context/auth/hooks';
import { useFetchEnvironments } from '@/context/environment/hooks';
import { useCreateEnvironment } from '@/hooks/use-environments';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { InlineToast } from '../primitives/inline-toast';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { EnvironmentFormData, EnvironmentFormFields, environmentFormSchema } from './environment-form';

const ENVIRONMENT_COLORS = [
  '#FF6B6B', // Vibrant Coral
  '#4ECDC4', // Bright Turquoise
  '#45B7D1', // Azure Blue
  '#96C93D', // Lime Green
  '#A66CFF', // Bright Purple
  '#FF9F43', // Bright Orange
  '#FF78C4', // Hot Pink
  '#20C997', // Emerald
  '#845EC2', // Royal Purple
  '#FF5E78', // Bright Red
] as const;

function getRandomColor(existingEnvironments: IEnvironment[] = []) {
  const usedColors = new Set(existingEnvironments.map((env) => (env as any).color).filter(Boolean));
  const availableColors = ENVIRONMENT_COLORS.filter((color) => !usedColors.has(color));

  // If all colors are used, fall back to the original list
  const colorPool = availableColors.length > 0 ? availableColors : ENVIRONMENT_COLORS;

  return colorPool[Math.floor(Math.random() * colorPool.length)];
}

type CreateEnvironmentButtonProps = ComponentProps<typeof Button>;

export const CreateEnvironmentButton = (props: CreateEnvironmentButtonProps) => {
  const { currentOrganization } = useAuth();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync, isPending } = useCreateEnvironment();
  const track = useTelemetry();

  const form = useForm<EnvironmentFormData>({
    resolver: standardSchemaResolver(environmentFormSchema),
    defaultValues: {
      name: '',
      color: getRandomColor(environments),
    },
  });

  const onSubmit = async (values: EnvironmentFormData) => {
    try {
      await mutateAsync({
        name: values.name,
        color: values.color,
      });

      setIsOpen(false);

      form.reset({
        name: '',
        color: getRandomColor(environments),
      });

      showSuccessToast('Environment created successfully');
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Failed to create environment';
      showErrorToast(Array.isArray(message) ? message[0] : message);
    }
  };

  const handleClick = () => {
    track(TelemetryEvent.CREATE_ENVIRONMENT_CLICK);
    setIsOpen(true);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <PermissionButton
        permission={PermissionsEnum.ENVIRONMENT_WRITE}
        mode="gradient"
        variant="primary"
        size="xs"
        leadingIcon={RiAddLine}
        onClick={handleClick}
        {...props}
      >
        Create environment
      </PermissionButton>

      <SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="py-3.5 px-3">
          <SheetTitle className="text-label-sm font-medium flex items-center gap-2">
            <RiDatabase2Line /> Create live environment
          </SheetTitle>
        </SheetHeader>
        <Separator />
        <SheetMain className="px-0">
          <div className="px-3">
            <Form {...form}>
              <FormRoot
                id="create-environment"
                autoComplete="off"
                noValidate
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <EnvironmentFormFields
                  form={form}
                  colorHelperText="Will be used to identify the environment in the UI."
                />
              </FormRoot>
            </Form>
          </div>
          <Separator className="my-[20px]" />
          <div className="px-3">
            <InlineToast
              variant={'tip'}
              title="Live environments are read-only"
              description={`Use them for staging, QA, previews. Great for safe reviews and testing!`}
            />
          </div>
        </SheetMain>
        <Separator />
        <SheetFooter>
          <Button
            size="xs"
            isLoading={isPending}
            trailingIcon={RiArrowRightSLine}
            variant="secondary"
            mode="gradient"
            type="submit"
            form="create-environment"
          >
            Create environment
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
