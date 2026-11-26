import { CredentialsKeyEnum, type IConfigCredential } from '@novu/shared';
import { type DragEvent, useId, useRef, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { RiInformationFill, RiLinkM, RiUploadCloud2Line } from 'react-icons/ri';
import { SetupButton } from '@/components/agents/setup-guide-primitives';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';
import { hasTemporaryAwsKey, isAwsAccessKeyId, parseAwsCredentials } from './parse-aws-credentials';

const KEY_ID_FIELD = `credentials.${CredentialsKeyEnum.ApiKey}` as const;
const SECRET_FIELD = `credentials.${CredentialsKeyEnum.SecretKey}` as const;
const REGION_FIELD = `credentials.${CredentialsKeyEnum.Region}` as const;

const SET_OPTIONS = { shouldDirty: true, shouldTouch: true, shouldValidate: true } as const;

/** Enough of the key ID to match it against the IAM console, without the whole of it on screen. */
function shortenKeyId(keyId: string) {
  return `${keyId.slice(0, 4)}…${keyId.slice(-4)}`;
}

/**
 * The AWS access key: the .csv file AWS downloads when it creates the key, dropped or chosen and read in
 * the browser. It fills the access key ID and the secret access key, and the region when the file names one; the
 * file itself isn't uploaded anywhere. Pasted credentials land in the same fields, so what shows comes from the
 * form's values. A key that can't be read as a file can be typed instead.
 */
export function AwsAccessKeyUpload({
  control,
  setValue,
  keyIdCredential,
  secretCredential,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  /** The two fields the file fills, shown to type the key instead. */
  keyIdCredential?: IConfigCredential;
  secretCredential?: IConfigCredential;
  isReadOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const keyId = useWatch({ control, name: KEY_ID_FIELD });
  const secret = useWatch({ control, name: SECRET_FIELD });
  const hasKey = isAwsAccessKeyId(keyId) && !!secret?.trim();

  const readFile = async (file: File | undefined) => {
    if (!file || isReadOnly) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      setFileError('Couldn’t read this file. Choose it again.');

      return;
    }

    const parsed = parseAwsCredentials(text);
    const parsedKeyId = parsed[CredentialsKeyEnum.ApiKey];
    const parsedSecret = parsed[CredentialsKeyEnum.SecretKey];

    if (!parsedKeyId || !parsedSecret || !isAwsAccessKeyId(parsedKeyId)) {
      setFileError(
        hasTemporaryAwsKey(text)
          ? 'This is a temporary key (ASIA…), which stops working within hours. Create an access key for an IAM user.'
          : 'This file has no access key. Upload the .csv file AWS downloaded when you created the key.'
      );

      return;
    }

    setFileError(undefined);
    setFileName(file.name);
    setIsTyping(false);
    setValue(KEY_ID_FIELD, parsedKeyId, SET_OPTIONS);
    setValue(SECRET_FIELD, parsedSecret, SET_OPTIONS);
    const region = parsed[CredentialsKeyEnum.Region];
    if (region) setValue(REGION_FIELD, region, SET_OPTIONS);
  };

  const openPicker = () => inputRef.current?.click();

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void readFile(event.dataTransfer.files[0]);
  };

  if (isTyping) {
    return (
      <>
        {keyIdCredential && (
          <CredentialSection credential={keyIdCredential} control={control} isReadOnly={isReadOnly} />
        )}
        {secretCredential && (
          <CredentialSection credential={secretCredential} control={control} isReadOnly={isReadOnly} />
        )}
        <SetupButton onClick={() => setIsTyping(false)} className="self-start">
          Upload the .csv file instead
        </SetupButton>
      </>
    );
  }

  return (
    <FormField
      control={control}
      name={SECRET_FIELD}
      rules={{
        // The key ID field isn't on screen here, so this one answers for both halves of the key.
        validate: (value, form) =>
          value?.trim() && isAwsAccessKeyId(form.credentials?.[CredentialsKeyEnum.ApiKey])
            ? true
            : 'Add the access key',
      }}
      render={({ field, fieldState }) => {
        const error = fileError ?? (hasKey ? undefined : fieldState.error?.message);

        return (
          <FormItem className="flex flex-col gap-1">
            <span id={labelId} className="text-label-xs text-text-sub">
              Access key file <span className="text-primary-base">*</span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
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
              {hasKey ? (
                <>
                  <RiLinkM className="text-text-sub size-5 shrink-0" />
                  <span className="text-text-strong font-code min-w-0 flex-1 truncate text-[12px] font-medium leading-4">
                    {fileName ?? 'Access key'}
                  </span>
                </>
              ) : (
                <>
                  <RiUploadCloud2Line className="text-text-soft size-5 shrink-0" />
                  <span className="text-label-xs text-text-soft min-w-0 flex-1">
                    Drop the .csv file here, click to choose it, or paste the key
                  </span>
                </>
              )}
            </button>
            {hasKey && !error && (
              <p className="text-paragraph-xs text-text-sub flex items-center gap-1" aria-live="polite">
                <RiInformationFill className="text-text-soft size-4 shrink-0" />
                Access key {shortenKeyId(keyId)} and its secret detected
              </p>
            )}
            {error && <FormMessage>{error}</FormMessage>}
            {!isReadOnly && (
              <div className="mt-3 flex flex-wrap gap-2">
                {hasKey && <SetupButton onClick={openPicker}>Choose another file</SetupButton>}
                <SetupButton onClick={() => setIsTyping(true)}>Type the key instead</SetupButton>
              </div>
            )}
          </FormItem>
        );
      }}
    />
  );
}

/** The regions Amazon SES sends from. A region outside this list, pasted, typed or read from a file, is added to it. */
const SES_REGIONS: { value: string; name: string }[] = [
  { value: 'us-east-1', name: 'US East (N. Virginia)' },
  { value: 'us-east-2', name: 'US East (Ohio)' },
  { value: 'us-west-1', name: 'US West (N. California)' },
  { value: 'us-west-2', name: 'US West (Oregon)' },
  { value: 'ca-central-1', name: 'Canada (Central)' },
  { value: 'sa-east-1', name: 'South America (São Paulo)' },
  { value: 'eu-west-1', name: 'Europe (Ireland)' },
  { value: 'eu-west-2', name: 'Europe (London)' },
  { value: 'eu-west-3', name: 'Europe (Paris)' },
  { value: 'eu-central-1', name: 'Europe (Frankfurt)' },
  { value: 'eu-north-1', name: 'Europe (Stockholm)' },
  { value: 'eu-south-1', name: 'Europe (Milan)' },
  { value: 'il-central-1', name: 'Israel (Tel Aviv)' },
  { value: 'me-south-1', name: 'Middle East (Bahrain)' },
  { value: 'af-south-1', name: 'Africa (Cape Town)' },
  { value: 'ap-south-1', name: 'Asia Pacific (Mumbai)' },
  { value: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
  { value: 'ap-southeast-3', name: 'Asia Pacific (Jakarta)' },
  { value: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', name: 'Asia Pacific (Seoul)' },
  { value: 'ap-northeast-3', name: 'Asia Pacific (Osaka)' },
  { value: 'us-gov-east-1', name: 'AWS GovCloud (US-East)' },
  { value: 'us-gov-west-1', name: 'AWS GovCloud (US-West)' },
];

const OTHER_REGION = '__other__';

/**
 * The SES region, picked from a list: a key works in every region, so the region can't be read from it. "Other
 * region" swaps the list for a text field, for a region the list doesn't have yet.
 */
export function AwsRegionField({
  control,
  label,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  label: string;
  isReadOnly?: boolean;
}) {
  const labelId = useId();
  const [isTyping, setIsTyping] = useState(false);

  return (
    <FormField
      control={control}
      name={REGION_FIELD}
      rules={{ validate: (value) => (value?.trim() ? true : 'Choose the region') }}
      render={({ field, fieldState }) => {
        const value = typeof field.value === 'string' ? field.value : '';
        const isListed = SES_REGIONS.some((region) => region.value === value);

        return (
          <FormItem className="flex flex-col gap-1">
            <span id={labelId} className="text-label-xs text-text-sub">
              {label} <span className="text-primary-base">*</span>
            </span>
            {isTyping ? (
              <>
                <FormControl>
                  <Input
                    size="md"
                    type="text"
                    aria-labelledby={labelId}
                    placeholder="eu-central-2"
                    value={value}
                    onChange={(event) => field.onChange(event.target.value.trim())}
                    onBlur={field.onBlur}
                    hasError={!!fieldState.error}
                    disabled={isReadOnly}
                    autoFocus
                  />
                </FormControl>
                <SetupButton onClick={() => setIsTyping(false)} className="mt-1 self-start">
                  Choose from the list
                </SetupButton>
              </>
            ) : (
              <FormControl>
                <Select
                  value={value}
                  onValueChange={(next) => {
                    if (next === OTHER_REGION) setIsTyping(true);
                    else field.onChange(next);
                  }}
                  disabled={isReadOnly}
                >
                  <SelectTrigger aria-labelledby={labelId}>
                    <SelectValue placeholder="Where your SES identity is verified" />
                  </SelectTrigger>
                  <SelectContent>
                    {value && !isListed && <SelectItem value={value}>{value}</SelectItem>}
                    {SES_REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.name} <span className="text-text-soft font-code">{region.value}</span>
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_REGION}>Other region…</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            )}
            {fieldState.error?.message && <FormMessage>{fieldState.error.message}</FormMessage>}
          </FormItem>
        );
      }}
    />
  );
}
