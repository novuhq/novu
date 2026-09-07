import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { IEnvironment, SECRET_MASK } from '@novu/shared';
import { useId, useMemo } from 'react';
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

const buildVariableSchema = (envIdsAllowedEmpty: Set<string>) =>
  z
    .object({
      key: z
        .string()
        .min(1, 'Variable key is required')
        .regex(VARIABLE_KEY_REGEX, 'Must start with a letter and only contain letters, numbers, and underscores'),
      environmentValues: z.record(z.string(), z.string()),
    })
    .superRefine((data, ctx) => {
      for (const [envId, value] of Object.entries(data.environmentValues)) {
        if (envIdsAllowedEmpty.has(envId)) continue;

        if (!value.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: 'Value is required',
            path: ['environmentValues', envId],
          });
        }
      }
    });

type VariableFormValues = z.infer<ReturnType<typeof buildVariableSchema>>;

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
  const isSecret = !!variable?.isSecret;

  // For secret variables we never receive the real value back from the API — only the
  // public mask placeholder. Render those env inputs as empty (meaning "keep existing")
  // so we don't echo the placeholder back to the API on save.
  const envIdsWithExistingSecret = useMemo(() => {
    if (!isEditing || !isSecret) return new Set<string>();

    return new Set(variable.values.filter((v) => v.value === SECRET_MASK).map((v) => v._environmentId));
  }, [isEditing, isSecret, variable]);

  const initialEnvironmentValues = Object.fromEntries(
    environments.map((env) => {
      const match = isEditing ? variable.values.find((v) => v._environmentId === env._id) : undefined;
      const value = match?.value ?? '';
      const isMasked = value === SECRET_MASK;

      return [env._id, isMasked ? '' : value];
    })
  );

  const variableSchema = useMemo(() => buildVariableSchema(envIdsWithExistingSecret), [envIdsWithExistingSecret]);

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
    resolver: standardSchemaResolver(variableSchema),
    shouldFocusError: false,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: VariableFormValues) => {
    onSubmitStart?.();

    try {
      if (isEditing) {
        // For edits, only send envs the user actually filled in. Empty inputs for envs
        // that already have a stored secret mean "keep existing". The backend merges
        // values per `_environmentId` so unspecified envs are left untouched.
        const values = Object.entries(data.environmentValues)
          .filter(([, value]) => value !== '')
          .map(([_environmentId, value]) => ({ _environmentId, value }));

        await updateEnvironmentVariable({
          variableKey: variable.key,
          key: data.key.trim(),
          ...(values.length > 0 ? { values } : {}),
        });
      } else {
        const values = Object.entries(data.environmentValues).map(([_environmentId, value]) => ({
          _environmentId,
          value,
        }));

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
            {environments.map((env) => {
              const hasExistingSecret = envIdsWithExistingSecret.has(env._id);
              const placeholder = hasExistingSecret ? `${SECRET_MASK} (leave blank to keep)` : `${env.name} value`;

              return (
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
                            <Input {...field} placeholder={placeholder} size="xs" hasError={!!fieldState.error} />
                          </FormControl>
                          {fieldState.error && <FormMessage />}
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              );
            })}
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
                to="https://docs.novu.co/platform/developer/environment-variables"
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
