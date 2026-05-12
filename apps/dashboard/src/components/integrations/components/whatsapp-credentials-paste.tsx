import { CredentialsKeyEnum } from '@novu/shared';
import { type ClipboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { RiCheckLine, RiClipboardLine, RiCloseLine, RiEyeOffLine, RiInformationLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Textarea } from '@/components/primitives/textarea';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';
import {
  getWhatsAppFieldDisplayName,
  isLikelyWhatsAppCredentialsBlock,
  type ParsedWhatsAppCredentials,
  parseWhatsAppCredentialsBlock,
  type WhatsAppCredentialField,
} from './parse-whatsapp-credentials-block';

const WHATSAPP_FIELDS: WhatsAppCredentialField[] = [
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.phoneNumberIdentification,
  CredentialsKeyEnum.businessAccountId,
  CredentialsKeyEnum.SecretKey,
];

const API_SETUP_FIELDS: WhatsAppCredentialField[] = [
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.phoneNumberIdentification,
  CredentialsKeyEnum.businessAccountId,
];

const PREVIEW_IMAGE_SRC = '/images/agents/whatsapp-paste-comp.gif';

type ApplyOutcome = {
  filled: WhatsAppCredentialField[];
  overwritten: WhatsAppCredentialField[];
  invalid: WhatsAppCredentialField[];
  masked: WhatsAppCredentialField[];
};

type WhatsAppCredentialsPasteProps = {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
};

/**
 * Smart-paste affordance for the WhatsApp Business agent onboarding form.
 *
 * Recognizes the freeform text copied from Meta's "API Setup" page and routes
 * the Access Token, Phone Number ID and WhatsApp Business Account ID into the
 * existing react-hook-form state. App Secret is on a different page in Meta —
 * the outcome message points users to it after a successful fill.
 */
export function WhatsAppCredentialsPaste({ control, setValue, isReadOnly }: WhatsAppCredentialsPasteProps) {
  const credentials = useWatch({ control, name: 'credentials' });
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [draft, setDraft] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronously mark the preview as loaded if the browser already has it
  // cached when the <img> mounts (the `onLoad` event would otherwise race).
  const handlePreviewRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setIsPreviewLoaded(true);
    }
  }, []);

  const handlePreviewLoaded = useCallback(() => {
    setIsPreviewLoaded(true);
  }, []);

  const apply = useCallback(
    (parsed: ParsedWhatsAppCredentials): ApplyOutcome => {
      const filled: WhatsAppCredentialField[] = [];
      const overwritten: WhatsAppCredentialField[] = [];

      for (const key of parsed.matched) {
        const value = parsed.values[key];
        if (value === undefined) continue;

        const previous = credentials?.[key];
        if (previous && previous !== value) {
          overwritten.push(key);
        }

        setValue(`credentials.${key}`, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        filled.push(key);
      }

      return {
        filled,
        overwritten,
        invalid: parsed.invalid,
        masked: parsed.masked,
      };
    },
    [credentials, setValue]
  );

  const handleParse = useCallback(
    (text: string) => {
      const parsed = parseWhatsAppCredentialsBlock(text);

      if (parsed.matched.length === 0 && parsed.masked.length === 0) {
        setOutcome({ filled: [], overwritten: [], invalid: [], masked: [] });

        return;
      }

      const result = apply(parsed);
      setOutcome(result);
      setDraft('');
      setIsExpanded(parsed.masked.length > 0);
    },
    [apply]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const text = event.clipboardData.getData('text/plain');
      if (!isLikelyWhatsAppCredentialsBlock(text)) {
        return;
      }

      event.preventDefault();
      handleParse(text);
    },
    [handleParse]
  );

  const handleManualParse = useCallback(() => {
    handleParse(draft);
  }, [draft, handleParse]);

  const dismiss = useCallback(() => {
    setOutcome(null);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => textareaRef.current?.focus());
      }

      return next;
    });
  }, []);

  if (isReadOnly) {
    return null;
  }

  return (
    <div className="border-stroke-weak bg-bg-white mb-3 flex flex-col overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        className={cn(
          'group flex w-full items-start gap-3 px-2 py-2 text-left transition-colors',
          'hover:bg-bg-weak focus-visible:bg-bg-weak focus-visible:outline-none'
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="text-text-soft" aria-hidden="true">
            <RiClipboardLine className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-text-strong text-label-xs font-medium leading-4">Skip the back and forth.</p>
            <p className="text-text-sub text-label-xs leading-4">
              Open <strong className="text-text-strong">API Setup</strong> in Meta, hit CMD+A and CMD+C, paste below —
              we&apos;ll pull out the Access Token, Phone Number ID and WhatsApp Business Account ID for you.
            </p>
          </div>
        </div>
        <div className="relative -mr-1 ml-auto h-[110px] w-[165px] shrink-0 self-center">
          <PreviewSkeleton isHidden={isPreviewLoaded} />
          <img
            ref={handlePreviewRef}
            src={PREVIEW_IMAGE_SRC}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={handlePreviewLoaded}
            onError={handlePreviewLoaded}
            className={cn(
              'border-stroke-weak absolute inset-0 block h-full w-full rounded border bg-bg-white',
              'object-contain object-right transition-opacity duration-300 ease-out',
              isPreviewLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-stroke-weak flex flex-col gap-2 border-t p-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onPaste={handlePaste}
            placeholder={'Paste the API Setup page from Meta here.\nPasting straight into any field below works too.'}
            rows={6}
            className="font-mono text-xs"
          />
          <div className="flex justify-end">
            <Button type="button" size="2xs" mode="outline" disabled={!draft.trim()} onClick={handleManualParse}>
              Fill fields
            </Button>
          </div>
        </div>
      )}

      {outcome && (
        <div className="border-stroke-weak border-t p-2">
          <PasteOutcomeSummary outcome={outcome} onDismiss={dismiss} />
        </div>
      )}
    </div>
  );
}

function PreviewSkeleton({ isHidden }: { isHidden: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'border-stroke-weak bg-bg-weak absolute inset-0 block overflow-hidden rounded border',
        'transition-opacity duration-300 ease-out',
        isHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      )}
    >
      <div className="flex h-full w-full flex-col gap-1.5 p-2">
        <div className="bg-bg-soft h-2 w-1/3 animate-pulse rounded-sm" />
        <div className="bg-bg-soft h-2 w-2/3 animate-pulse rounded-sm [animation-delay:120ms]" />
        <div className="bg-bg-soft mt-1 h-3 w-full animate-pulse rounded-sm [animation-delay:240ms]" />
        <div className="bg-bg-soft h-2 w-1/2 animate-pulse rounded-sm [animation-delay:360ms]" />
        <div className="bg-bg-soft mt-auto h-3 w-full animate-pulse rounded-sm [animation-delay:480ms]" />
      </div>
    </div>
  );
}

type OutcomeTone = 'success' | 'warning' | 'info';

function getOutcomeTone({ masked, filled }: ApplyOutcome): OutcomeTone {
  if (masked.length > 0) return 'warning';
  if (filled.length === 0) return 'info';

  return 'success';
}

const TONE_ICON_CLASS: Record<OutcomeTone, string> = {
  success: 'text-success-base',
  warning: 'text-warning-base',
  info: 'text-warning-base',
};

function OutcomeIcon({ tone }: { tone: OutcomeTone }) {
  if (tone === 'warning') return <RiEyeOffLine className="size-4" />;
  if (tone === 'info') return <RiInformationLine className="size-4" />;

  return <RiCheckLine className="size-4" />;
}

function OutcomeHeadline({ tone, outcome }: { tone: OutcomeTone; outcome: ApplyOutcome }) {
  if (tone === 'warning') {
    return <MaskedFieldsHeadline outcome={outcome} />;
  }

  if (tone === 'info') {
    return (
      <p className="text-text-strong text-label-xs font-medium">
        Couldn&apos;t recognize a WhatsApp credentials block in the pasted text. Fill the fields below manually.
      </p>
    );
  }

  return (
    <p className="text-text-strong text-label-xs font-medium">
      Filled {outcome.filled.length} of {WHATSAPP_FIELDS.length} fields
      {formatOverwrittenSuffix(outcome.overwritten.length)}.
    </p>
  );
}

function formatOverwrittenSuffix(count: number): string {
  if (count === 0) return '';

  const noun = count === 1 ? 'value' : 'values';

  return ` · replaced ${count} existing ${noun}`;
}

function PasteOutcomeSummary({ outcome, onDismiss }: { outcome: ApplyOutcome; onDismiss: () => void }) {
  const tone = getOutcomeTone(outcome);

  const stillMissingFromApiSetup = useMemo(
    () => API_SETUP_FIELDS.filter((key) => !outcome.filled.includes(key) && !outcome.masked.includes(key)),
    [outcome.filled, outcome.masked]
  );
  const appSecretMissing =
    !outcome.filled.includes(CredentialsKeyEnum.SecretKey) && !outcome.masked.includes(CredentialsKeyEnum.SecretKey);
  const showAppSecretHint = tone === 'success' && appSecretMissing;
  const showApiSetupGap = tone === 'success' && stillMissingFromApiSetup.length > 0;

  return (
    <div className="border-stroke-weak bg-bg-white flex items-start gap-2 rounded-md border p-2">
      <span className={cn('mt-0.5', TONE_ICON_CLASS[tone])}>
        <OutcomeIcon tone={tone} />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <OutcomeHeadline tone={tone} outcome={outcome} />

        {showApiSetupGap && (
          <p className="text-text-soft text-label-xs">
            Still empty: {stillMissingFromApiSetup.map(getWhatsAppFieldDisplayName).join(', ')}.
          </p>
        )}

        {showAppSecretHint && (
          <p className="text-text-soft text-label-xs leading-4">
            <strong className="text-text-strong font-medium">App Secret</strong> lives on a different page in Meta —
            open <strong className="text-text-strong font-medium">App settings &gt; Basic</strong> from the bottom of
            the left sidebar, then paste the value into the field below.
          </p>
        )}

        {outcome.invalid.length > 0 && (
          <p className="text-warning-base text-label-xs">
            Double-check format: {outcome.invalid.map(getWhatsAppFieldDisplayName).join(', ')}.
          </p>
        )}
      </div>
      <button
        type="button"
        className="text-text-soft hover:text-text-strong cursor-pointer"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <RiCloseLine className="size-3.5" />
      </button>
    </div>
  );
}

function MaskedFieldsHeadline({ outcome }: { outcome: ApplyOutcome }) {
  const maskedNames = outcome.masked.map(getWhatsAppFieldDisplayName);
  const filledCount = outcome.filled.length;
  const isSingular = maskedNames.length === 1;

  const headline =
    filledCount > 0
      ? `Filled ${filledCount} of ${WHATSAPP_FIELDS.length} fields — ${formatList(maskedNames)} still hidden.`
      : `${formatList(maskedNames)} ${isSingular ? 'is' : 'are'} still hidden behind dots.`;

  return (
    <>
      <p className="text-text-strong text-label-xs font-medium">{headline}</p>
      <p className="text-text-sub text-label-xs leading-4">
        In Meta, click <span className="text-text-strong font-medium">Show</span> next to {formatList(maskedNames)} to
        reveal {isSingular ? 'it' : 'them'}, then paste again.
      </p>
    </>
  );
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
