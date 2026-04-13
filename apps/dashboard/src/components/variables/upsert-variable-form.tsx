import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { IEnvironment } from '@novu/shared';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { RiInformationLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { NovuApiError } from '@/api/api.client';
import type { EnvironmentVariableResponseDto } from '@/api/environment-variables';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/primitives/form/form';
import { Hint, HintIcon } from '@/components/primitives/hint';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useCreateEnvironmentVariable } from '@/hooks/use-create-environment-variable';
import { useUpdateEnvironmentVariable } from '@/hooks/use-update-environment-variable';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';

const VARIABLE_KEY_REGEX = /^[A-Za-z][A-Za-z0-9_]*$/;

const VariableSchema = z
  .object({
    key: z
      .string()
      .min(1, 'Variable key is required')
      .regex(VARIABLE_KEY_REGEX, 'Must start with a letter and only contain letters, numbers, and underscores'),
    environmentValues: z.record(z.string(), z.string()),
  })
  .superRefine((data, ctx) => {
    for (const [envId, value] of Object.entries(data.environmentValues)) {
      if (!value.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Value is required',
          path: ['environmentValues', envId],
        });
      }
    }
  });

type VariableFormValues = z.infer<typeof VariableSchema>;

type UpsertVariableFormProps = {
  formId?: string;
  environments: IEnvironment[];
  variable?: EnvironmentVariableResponseDto;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onSubmitStart?: () => void;
};

export const UpsertVariableForm = ({
  formId: providedFormId,
  environments,
  variable,
  onSuccess,
  onError,
  onSubmitStart,
}: UpsertVariableFormProps) => {
  const generatedFormId = useId();
  const formId = providedFormId ?? generatedFormId;
  const isEditing = !!variable;

  const initialEnvironmentValues = Object.fromEntries(
    environments.map((env) => {
      const match = isEditing ? variable.values.find((v) => v._environmentId === env._id) : undefined;

      return [env._id, match?.value ?? ''];
    })
  );

  const { createEnvironmentVariable } = useCreateEnvironmentVariable({
    onSuccess: () => {
      showSuccessToast('Variable created successfully');
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof NovuApiError && error.status === 409) {
        form.setError('key', { type: 'manual', message: 'A variable with this key already exists' });
      } else {
        const message = error instanceof Error ? error.message : 'Failed to create variable';
        showErrorToast(message);
      }
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
  });

  const { updateEnvironmentVariable } = useUpdateEnvironmentVariable({
    onSuccess: () => {
      showSuccessToast('Variable updated successfully');
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update variable';
      showErrorToast(message);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
  });

  const form = useForm<VariableFormValues>({
    defaultValues: {
      key: variable?.key ?? '',
      environmentValues: initialEnvironmentValues,
    },
    resolver: standardSchemaResolver(VariableSchema),
    shouldFocusError: false,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: VariableFormValues) => {
    onSubmitStart?.();

    const values = Object.entries(data.environmentValues).map(([_environmentId, value]) => ({
      _environmentId,
      value,
    }));

    try {
      if (isEditing) {
        await updateEnvironmentVariable({
          variableKey: variable.key,
          key: data.key.trim(),
          values,
        });
      } else {
        await createEnvironmentVariable({
          key: data.key.trim(),
          values,
        });
      }
    } catch {
      // errors are handled by the mutation's onError callback
    }
  };

  return (
    <Form {...form}>
      <FormRoot
        id={formId}
        autoComplete="off"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="key"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Variable key</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. BASE_URL"
                  size="xs"
                  hasError={!!fieldState.error}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              {fieldState.error ? (
                <FormMessage />
              ) : (
                <Hint>
                  <HintIcon as={RiInformationLine} />
                  Must start with a letter and only contain letters, numbers, and underscores
                </Hint>
              )}
            </FormItem>
          )}
        />

        <Separator />

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-text-strong text-xs font-medium">Values</p>
            <p className="text-text-sub text-xs">Add values for this variable in different environments.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            {environments.map((env) => (
              <FormField
                key={env._id}
                control={form.control}
                name={`environmentValues.${env._id}`}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <div className="flex w-[175px] shrink-0 items-center gap-1.5">
                        <EnvironmentBranchIcon environment={env} size="sm" />
                        <span className="text-text-sub truncate text-xs font-medium">{env.name}</span>
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <FormControl>
                          <Input {...field} placeholder={`${env.name} value`} size="xs" hasError={!!fieldState.error} />
                        </FormControl>
                        {fieldState.error && <FormMessage />}
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
          <div className="flex gap-2">
            <div className="bg-faded-base mt-0.5 h-auto w-1 shrink-0 rounded-full" />
            <p className="text-text-sub text-xs">
              <span className="text-text-strong font-medium">Note</span>
              {': These values can be accessed in the workflows via '}
              <code className="font-mono">{'{{env.'}</code>
              <code className="font-mono text-text-strong">{'KEY'}</code>
              <code className="font-mono">{'}}'}</code>
              {'. '}
              <Link
                to="https://docs.novu.co/platform/workflow/template-editor/variables"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-sub underline"
              >
                Learn more ↗
              </Link>
            </p>
          </div>
        </div>
      </FormRoot>
    </Form>
  );
};
