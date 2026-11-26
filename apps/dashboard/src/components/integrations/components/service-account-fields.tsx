import { CredentialsKeyEnum } from '@novu/shared';
import { type DragEvent, useId, useRef, useState } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { RiEyeLine, RiEyeOffLine, RiInformationFill, RiLinkM, RiUploadCloud2Line } from 'react-icons/ri';
import { z } from 'zod';
import { SetupButton } from '@/components/agents/setup-guide-primitives';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { Textarea } from '@/components/primitives/textarea';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';

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
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <FormField
      control={control}
      name={FIELD}
      rules={SERVICE_ACCOUNT_RULES}
      render={({ field, fieldState }) => {
        const value = typeof field.value === 'string' ? field.value : '';
        const isMasked = !isRevealed && value.trim() !== '';

        const reveal = () => {
          setIsRevealed(true);
          // The textarea mounts on the next render; focus it there so editing can start.
          requestAnimationFrame(() => textareaRef.current?.focus());
        };

        const eye = value.trim() !== '' && (
          <button
            type="button"
            aria-label={isMasked ? 'Show the service account JSON' : 'Hide the service account JSON'}
            onClick={isMasked ? reveal : () => setIsRevealed(false)}
            className="text-text-soft hover:text-text-sub absolute right-2 top-2"
          >
            {isMasked ? <RiEyeLine className="size-3.5" /> : <RiEyeOffLine className="size-3.5" />}
          </button>
        );

        return (
          <FormItem className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-label-xs text-text-sub">
              {label} <span className="text-primary-base">*</span>
            </label>
            <div className="relative">
              {isMasked ? (
                <button
                  id={inputId}
                  type="button"
                  onClick={reveal}
                  disabled={isReadOnly}
                  aria-label="Service account JSON, private key hidden. Show it to edit."
                  className={cn(
                    'bg-bg-white border-stroke-soft font-code text-text-strong w-full overflow-hidden whitespace-pre-wrap break-all rounded-md border p-2 pr-7 text-left text-[12px] font-medium leading-5 shadow-xs',
                    fieldState.error && 'border-error-base'
                  )}
                >
                  {maskServiceAccount(value)}
                </button>
              ) : (
                <FormControl>
                  <Textarea
                    ref={textareaRef}
                    id={inputId}
                    simple
                    rows={8}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder='{ "type": "service_account", "project_id": … }'
                    value={value}
                    onChange={field.onChange}
                    onBlur={() => {
                      field.onBlur();
                      setIsRevealed(false);
                    }}
                    disabled={isReadOnly}
                    hasError={!!fieldState.error}
                    className="font-code pr-7 text-[12px] leading-5"
                  />
                </FormControl>
              )}
              {eye}
            </div>
            {fieldState.error?.message && <FormMessage>{fieldState.error.message}</FormMessage>}
          </FormItem>
        );
      }}
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
  const labelId = useId();
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);

  const readFile = async (file: File | undefined) => {
    if (!file || isReadOnly) return;

    const text = await file.text();
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

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void readFile(event.dataTransfer.files[0]);
  };

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
              <span id={labelId} className="text-label-xs text-text-sub">
                Service account file <span className="text-primary-base">*</span>
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-labelledby={labelId}
                disabled={isReadOnly}
                onChange={(event) => {
                  void readFile(event.target.files?.[0]);
                  // Choosing the same file again should read it again.
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                aria-labelledby={labelId}
                disabled={isReadOnly}
                onClick={openPicker}
                onBlur={field.onBlur}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'bg-bg-weak border-stroke-soft flex w-full items-center gap-2 rounded-md border border-dashed p-2 text-left shadow-xs transition-colors disabled:cursor-not-allowed',
                  isDragging && 'border-stroke-strong bg-bg-white',
                  error && 'border-error-base'
                )}
              >
                {hasFile ? (
                  <>
                    <RiLinkM className="text-text-sub size-5 shrink-0" />
                    <span className="text-text-strong font-code min-w-0 flex-1 truncate text-[12px] font-medium leading-4">
                      {fileName ?? 'Service account JSON'}
                    </span>
                  </>
                ) : (
                  <>
                    <RiUploadCloud2Line className="text-text-soft size-5 shrink-0" />
                    <span className="text-label-xs text-text-soft min-w-0 flex-1">
                      Drop the JSON file here, or click to choose it
                    </span>
                  </>
                )}
              </button>
              {hasFile && !error && (
                <p className="text-paragraph-xs text-text-sub flex items-center gap-1" aria-live="polite">
                  <RiInformationFill className="text-text-soft size-4 shrink-0" />
                  Project {projectId} detected
                </p>
              )}
              {error && <FormMessage>{error}</FormMessage>}
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
