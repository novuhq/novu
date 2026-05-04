import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';

export type SenderAddressOverrideProps = {
  serverEnabled: boolean;
  serverValue: string;
  outboundFromAddress: string;
  inboundAddresses: string[];
  onSave: (params: { enabled: boolean; value: string }) => Promise<void>;
};

export function SenderAddressOverride({
  serverEnabled,
  serverValue,
  outboundFromAddress,
  inboundAddresses,
  onSave,
}: SenderAddressOverrideProps) {
  const switchId = useId();
  const inputId = useId();

  const [enabled, setEnabled] = useState(serverEnabled);
  const [value, setValue] = useState(serverValue);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync local form state with server values when they change AND the user
  // hasn't started editing. Compare against the previous server snapshot so we
  // don't clobber unsaved edits during background refetches/invalidations.
  const prevServerEnabled = useRef(serverEnabled);
  const prevServerValue = useRef(serverValue);
  useEffect(() => {
    const localMatchesPrevServer = enabled === prevServerEnabled.current && value === prevServerValue.current;
    if (localMatchesPrevServer) {
      setEnabled(serverEnabled);
      setValue(serverValue);
    }
    prevServerEnabled.current = serverEnabled;
    prevServerValue.current = serverValue;
  }, [serverEnabled, serverValue, enabled, value]);

  const placeholder = outboundFromAddress || 'no-reply@yourdomain.com';
  const inputErrorId = `${inputId}-error`;

  const trimmedValue = value.trim();
  const isDirty = enabled !== serverEnabled || trimmedValue !== serverValue.trim();
  const hasInvalidValue = enabled && trimmedValue.length > 0 && !isValidEmail(trimmedValue);
  const canSave = isDirty && !isSaving && !hasInvalidValue;

  // Mirror the resolution in apps/api/src/app/agents/services/chat-sdk.service.ts
  // buildSendEmailCallback: override > outbound.from > agent inbound.
  const previewOverride = enabled ? trimmedValue : '';
  const fallbackInbound = inboundAddresses[0] ?? '';
  const resolvedFrom = previewOverride || outboundFromAddress || fallbackInbound;
  const resolvedReplyTo = resolvedFrom && resolvedFrom !== fallbackInbound ? fallbackInbound : '';

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await onSave({ enabled, value: trimmedValue });
      setValue(trimmedValue);
      showSuccessToast('Sender settings saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save sender settings.';
      showErrorToast(message, 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between gap-2">
        <label htmlFor={switchId} className="text-text-sub text-label-xs cursor-pointer font-medium leading-4">
          Use a custom From address
        </label>
        <Switch id={switchId} checked={enabled} onCheckedChange={setEnabled} disabled={isSaving} />
      </div>

      {enabled && (
        <div className="flex w-full flex-col gap-1">
          <Input
            id={inputId}
            type="email"
            size="2xs"
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            hasError={hasInvalidValue}
            aria-invalid={hasInvalidValue ? true : undefined}
            aria-errormessage={hasInvalidValue ? inputErrorId : undefined}
            disabled={isSaving}
          />
          {hasInvalidValue && (
            <p id={inputErrorId} className="text-destructive text-label-xs leading-4">
              Enter a valid email address (for example, name@company.com).
            </p>
          )}
        </div>
      )}

      <AddressPreview from={resolvedFrom} replyTo={resolvedReplyTo} />

      {isDirty && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            mode="filled"
            size="2xs"
            onClick={handleSave}
            disabled={!canSave}
            isLoading={isSaving}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function AddressPreview({ from, replyTo }: { from: string; replyTo: string }) {
  return (
    <div className="border-stroke-soft bg-bg-weak flex flex-col gap-1 rounded-md border px-2.5 py-2">
      <PreviewRow label="From" value={from || 'Not configured yet'} muted={!from} />
      <PreviewRow label="Reply-To" value={replyTo || 'Not set (replies go to From)'} muted={!replyTo} />
    </div>
  );
}

function PreviewRow({ label, value, muted }: { label: string; value: string; muted: boolean }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="text-text-soft text-[10px] w-[52px] shrink-0 font-medium uppercase leading-4 whitespace-nowrap">
        {label}
      </span>
      <span
        className={
          muted
            ? 'text-text-soft text-paragraph-xs min-w-0 flex-1 italic'
            : 'text-text-strong font-code min-w-0 flex-1 text-[12px] leading-4 break-all'
        }
      >
        {value}
      </span>
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}
