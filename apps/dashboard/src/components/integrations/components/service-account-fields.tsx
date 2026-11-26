import { CredentialsKeyEnum } from '@novu/shared';
import { useRef, useState } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { z } from 'zod';
import { SetupButton } from '@/components/agents/setup-guide-primitives';
import { FormField, FormItem } from '@/components/primitives/form/form';
import type { IntegrationFormData } from '../types';
import { FILE_READ_ERROR, FileDropZone, readFileText } from './file-drop-zone';
import { MaskedSecretTextarea } from './masked-secret-textarea';

const FIELD = `credentials.${CredentialsKeyEnum.ServiceAccount}` as const;

/** The parts of a Firebase service account file Novu needs: the project and the private key it signs in with. */
const serviceAccountSchema = z.object({
  project_id: z.string().min(1),
  private_key: z.string().min(1),
});

type ParsedServiceAccount = { projectId: string } | { error: string };

function parseServiceAccount(text: string): ParsedServiceAccount {
  let json: ReturnType<typeof JSON.parse>;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: 'This file isn’t valid JSON. Upload the file Firebase downloaded.' };
  }

  const result = serviceAccountSchema.safeParse(json);
  if (!result.success) {
    return { error: 'This JSON file has no project or private key. Generate a new private key in Firebase.' };
  }

  return { projectId: result.data.project_id };
}

function readProjectId(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const parsed = parseServiceAccount(value);

  return 'projectId' in parsed ? parsed.projectId : undefined;
}

const SERVICE_ACCOUNT_RULES = {
  required: 'Add the service account JSON',
  validate: (value: string | undefined) =>
    !value?.trim() || readProjectId(value) !== undefined
      ? true
      : 'Use the service account JSON file Firebase downloaded',
};

/** The file with the private key and its ID hidden, so it can be checked at a glance without showing the secret. */
function maskServiceAccount(text: string) {
  let json: ReturnType<typeof JSON.parse>;
  try {
    json = JSON.parse(text);
  } catch {
    return '••••••••••••••••';
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return '••••••••••••••••';

  const masked = { ...json };
  if (typeof masked.private_key_id === 'string') masked.private_key_id = `${masked.private_key_id.slice(0, 5)}••••••••`;
  if (typeof masked.private_key === 'string') masked.private_key = '-----BEGIN PRIVATE KEY-----\n••••';

  return JSON.stringify(masked, null, 2);
}

/**
 * Manual setup's field: the service account JSON pasted in. Once it holds a key, it shows the file with the private
 * key hidden; the eye shows the whole file to edit it.
 */
export function ServiceAccountPaste({
  control,
  label,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  label: string;
  isReadOnly?: boolean;
}) {
  return (
    <MaskedSecretTextarea
      control={control}
      name={FIELD}
      label={label}
      rules={SERVICE_ACCOUNT_RULES}
      mask={maskServiceAccount}
      placeholder='{ "type": "service_account", "project_id": … }'
      secretName="service account JSON"
      isReadOnly={isReadOnly}
    />
  );
}

/**
 * The Firebase service account as a file: dropped or chosen, read in the browser, and kept as the JSON text the
 * integration stores. The file itself isn't uploaded anywhere.
 */
export function ServiceAccountUpload({
  control,
  setValue,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState<string>();

  const readFile = async (file: File) => {
    const text = await readFileText(file);
    if (text === undefined) {
      setFileError(FILE_READ_ERROR);

      return;
    }

    const parsed = parseServiceAccount(text);
    if ('error' in parsed) {
      setFileError(parsed.error);

      return;
    }

    setFileError(undefined);
    setFileName(file.name);
    setValue(FIELD, text, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <FormField
      control={control}
      name={FIELD}
      rules={SERVICE_ACCOUNT_RULES}
      render={({ field, fieldState }) => {
        const projectId = readProjectId(field.value);
        const hasFile = projectId !== undefined;
        const error = fileError ?? fieldState.error?.message;

        return (
          <FormItem className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <FileDropZone
                inputRef={inputRef}
                label="Service account file"
                accept="application/json,.json"
                fileLabel={hasFile ? (fileName ?? 'Service account JSON') : undefined}
                emptyText="Drop the JSON file here, or click to choose it"
                detectedText={hasFile ? `Project ${projectId} detected` : undefined}
                error={error}
                disabled={isReadOnly}
                onFile={(file) => void readFile(file)}
                onBlur={field.onBlur}
              />
            </div>
            {hasFile && !isReadOnly && (
              <SetupButton onClick={openPicker} className="self-start">
                Choose another file
              </SetupButton>
            )}
          </FormItem>
        );
      }}
    />
  );
}
