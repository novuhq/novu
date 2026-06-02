import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';

export type SenderAddressOverrideProps = {
  serverEnabled: boolean;
  serverValue: string;
  defaultSenderName: string;
  /** Cloud shared inbox (`slug-key@agentconnect.sh`) — used when no custom-domain routes exist. */
  sharedInboundAddress?: string;
  outboundFromAddress: string;
  inboundAddresses: string[];
  onSave: (params: { enabled: boolean; value: string }) => Promise<void>;
  /**
   * Locks the override controls when the agent is wired to a sender that
   * physically can't honour a custom From — currently the bundled Novu demo
   * provider, which sends from the shared agent inbox and ignores
   * `useFromAddressOverride` / `fromAddressOverride` entirely
   * (see chat-sdk.service.ts buildSendEmailCallback). Server state is left
   * intact so a previously saved override snaps back the moment the user
   * attaches a real outbound provider.
   */
  disabled?: boolean;
  disabledReason?: ReactNode;
};

export function SenderAddressOverride({
  serverEnabled,
  serverValue,
  defaultSenderName,
  sharedInboundAddress,
  outboundFromAddress,
  inboundAddresses,
  onSave,
  disabled = false,
  disabledReason,
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
  const canSave = !disabled && isDirty && !isSaving && !hasInvalidValue;

  // Mirror the resolution in apps/api/src/app/agents/services/chat-sdk.service.ts
  // buildSendEmailCallback: override > agent inbound > outbound.from. When the
  // override is locked (demo sender), the override is server-side ignored, so
  // we drop it from the preview to match the address subscribers will actually
  // see in their inbox.
  const previewOverride = !disabled && enabled ? trimmedValue : '';
  const sharedInbound = sharedInboundAddress?.trim() ?? '';
  const fallbackInbound = inboundAddresses[0] ?? '';
  const agentInboundAddress = sharedInbound || fallbackInbound;
  const resolvedFrom = previewOverride || agentInboundAddress || outboundFromAddress;
  const resolvedReplyTo =
    resolvedFrom && agentInboundAddress && resolvedFrom !== agentInboundAddress ? agentInboundAddress : '';

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

  const labelClassName = disabled
    ? 'text-text-soft text-label-xs font-medium leading-4'
    : 'text-text-sub text-label-xs cursor-pointer font-medium leading-4';

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between gap-2">
        <label htmlFor={switchId} className={labelClassName}>
          Use a custom From address
        </label>
        <Switch
          id={switchId}
          checked={enabled && !disabled}
          onCheckedChange={setEnabled}
          disabled={isSaving || disabled}
        />
      </div>

      {enabled && !disabled && (
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

      <AddressPreview fromName={defaultSenderName} from={resolvedFrom} replyTo={resolvedReplyTo} />

      {disabled && disabledReason ? (
        <p className="text-text-soft text-paragraph-xs leading-4">{disabledReason}</p>
      ) : null}

      {!disabled && isDirty && (
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

function AddressPreview({ fromName, from, replyTo }: { fromName: string; from: string; replyTo: string }) {
  const fromDisplay = from ? formatFromHeader(fromName, from) : '';

  return (
    <div className="border-stroke-soft bg-bg-weak flex flex-col gap-1 rounded-md border px-2.5 py-2">
      <PreviewRow label="From name" value={fromName || 'Not configured yet'} muted={!fromName} />
      <PreviewRow label="From" value={fromDisplay || 'Not configured yet'} muted={!from} />
      <PreviewRow label="Reply-To" value={replyTo || 'Not set (replies go to From)'} muted={!replyTo} />
    </div>
  );
}

function formatFromHeader(name: string, email: string): string {
  if (!name) {
    return email;
  }

  return `${name} <${email}>`;
}

function PreviewRow({ label, value, muted }: { label: string; value: string; muted: boolean }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0">
      <span className="text-text-soft text-[10px] shrink-0 font-medium uppercase leading-4">{label}</span>
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
