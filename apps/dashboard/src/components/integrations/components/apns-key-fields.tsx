import { CredentialsKeyEnum, type IConfigCredential } from '@novu/shared';
import { useId, useRef, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { SetupButton } from '@/components/agents/setup-guide-primitives';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import type { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';
import { FILE_READ_ERROR, FileDropZone, readFileText } from './file-drop-zone';
import { MaskedSecretTextarea } from './masked-secret-textarea';
import { SegmentedControl } from './provider-setup-layout';

const KEY_FIELD = `credentials.${CredentialsKeyEnum.SecretKey}` as const;
const KEY_ID_FIELD = `credentials.${CredentialsKeyEnum.ApiKey}` as const;
const ENVIRONMENT_FIELD = `credentials.${CredentialsKeyEnum.Secure}` as const;

/** Apple names the file it downloads AuthKey_<Key ID>.p8; the Key ID is 10 letters and digits. */
const KEY_FILE_NAME = /^AuthKey_([A-Z0-9]{10})(?:\s*\(\d+\))?\.p8$/i;

function readKeyId(fileName: string) {
  return KEY_FILE_NAME.exec(fileName)?.[1]?.toUpperCase();
}

function isPrivateKey(text: string) {
  return text.includes('-----BEGIN PRIVATE KEY-----') && text.includes('-----END PRIVATE KEY-----');
}

const KEY_RULES = {
  required: 'Add the .p8 auth key',
  // `required` lets whitespace through, so an empty-looking key is caught here too.
  validate: (value: string | undefined) => {
    if (!value?.trim()) return 'Add the .p8 auth key';

    return isPrivateKey(value) ? true : 'Use the .p8 auth key Apple downloaded';
  },
};

/**
 * Every APNs key is an EC P-256 key in PKCS#8, so its first 48 base64 characters are the same fixed header in every
 * file: showing them gives nothing away and tells the user the paste looks right.
 */
const APNS_KEY_HEADER = 'MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg';

/** The key with its BEGIN and END lines and the shared header shown, and the secret part hidden. */
function maskPrivateKey(text: string) {
  if (!isPrivateKey(text)) return '••••••••••••••••';

  const body = text.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const shown = body.startsWith(APNS_KEY_HEADER) ? APNS_KEY_HEADER : '';

  return `-----BEGIN PRIVATE KEY-----\n${shown}••••\n-----END PRIVATE KEY-----`;
}

/** Manual setup's key: the .p8 file's contents pasted in, shown with the secret part hidden. */
export function ApnsKeyPaste({
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
      name={KEY_FIELD}
      label={label}
      rules={KEY_RULES}
      mask={maskPrivateKey}
      placeholder={'-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----'}
      secretName="private key"
      rows={6}
      isReadOnly={isReadOnly}
    />
  );
}

/**
 * Quick setup's APNs key: the .p8 file dropped or chosen, read in the browser, and kept as the key text the
 * integration stores. The Key ID comes from the file name; when it can't, the Key ID field shows to type it.
 */
export function ApnsKeyUpload({
  control,
  setValue,
  keyIdCredential,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  /** The Key ID field, shown when the file name doesn't carry it. */
  keyIdCredential?: IConfigCredential;
  isReadOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [detectedKeyId, setDetectedKeyId] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const keyValue = useWatch({ control, name: KEY_FIELD });
  const keyIdValue = useWatch({ control, name: KEY_ID_FIELD });
  const hasKey = typeof keyValue === 'string' && isPrivateKey(keyValue);
  const isKeyIdDetected = !!detectedKeyId && keyIdValue === detectedKeyId;
  // From the form's values, not only this upload's state: switching to Manual and back remounts this with no file
  // name, and a key without a Key ID still needs its field.
  const showsKeyIdField = hasKey && !isKeyIdDetected;

  const readFile = async (file: File) => {
    const text = await readFileText(file);
    if (text === undefined) {
      setFileError(FILE_READ_ERROR);

      return;
    }

    if (!isPrivateKey(text)) {
      setFileError('This file isn’t an APNs auth key. Upload the .p8 file Apple downloaded.');

      return;
    }

    const keyId = readKeyId(file.name);
    setFileError(undefined);
    setFileName(file.name);
    setDetectedKeyId(keyId);
    setValue(KEY_FIELD, text.trim(), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    // A renamed file leaves the Key ID to type, so one read from an earlier file doesn't stay behind.
    setValue(KEY_ID_FIELD, keyId ?? '', { shouldDirty: true, shouldTouch: true, shouldValidate: !!keyId });
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <>
      <FormField
        control={control}
        name={KEY_FIELD}
        rules={KEY_RULES}
        render={({ field, fieldState }) => {
          const hasFile = typeof field.value === 'string' && isPrivateKey(field.value);
          const error = fileError ?? fieldState.error?.message;

          return (
            <FormItem className="flex flex-col gap-1">
              <FileDropZone
                inputRef={inputRef}
                label="Auth key file"
                accept=".p8"
                fileLabel={hasFile ? (fileName ?? 'APNs auth key') : undefined}
                emptyText="Drop the .p8 file here, or click to choose it"
                detectedText={hasFile && isKeyIdDetected ? `Key ID ${detectedKeyId} detected` : undefined}
                error={error}
                disabled={isReadOnly}
                onFile={(file) => void readFile(file)}
                onBlur={field.onBlur}
              />
              {hasFile && !isReadOnly && (
                <SetupButton onClick={openPicker} className="mt-3 self-start">
                  Choose another file
                </SetupButton>
              )}
            </FormItem>
          );
        }}
      />
      {showsKeyIdField && keyIdCredential && (
        <CredentialSection
          credential={{
            ...keyIdCredential,
            description:
              fileName && !detectedKeyId
                ? 'The file was renamed, so copy the Key ID from Keys in Apple Developer.'
                : 'Copy the Key ID from Keys in Apple Developer.',
          }}
          control={control}
          isReadOnly={isReadOnly}
        />
      )}
    </>
  );
}

const ENVIRONMENT_OPTIONS = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'production', label: 'Production' },
] as const;

/**
 * Which APNs server Novu sends to. Apple keeps device tokens apart: Xcode debug builds get Sandbox tokens, while
 * TestFlight and App Store builds get Production ones. Stored in `secure` as "true" or "false"; the API turns it
 * into a boolean, and true sends to Production. It starts on Production (the form's default), as most tokens come
 * from TestFlight and App Store builds.
 */
export function ApnsEnvironmentField({
  control,
  label,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  label: string;
  isReadOnly?: boolean;
}) {
  const labelId = useId();

  return (
    <FormField
      control={control}
      name={ENVIRONMENT_FIELD}
      render={({ field }) => {
        const isProduction = String(field.value) === 'true';

        return (
          <FormItem className="flex flex-col gap-1">
            <span id={labelId} className="text-label-xs text-text-sub">
              {label}
            </span>
            <FormControl>
              <SegmentedControl
                aria-labelledby={labelId}
                value={isProduction ? 'production' : 'sandbox'}
                onValueChange={(next) => field.onChange(next === 'production' ? 'true' : 'false')}
                options={[...ENVIRONMENT_OPTIONS]}
                disabled={isReadOnly}
              />
            </FormControl>
          </FormItem>
        );
      }}
    />
  );
}
