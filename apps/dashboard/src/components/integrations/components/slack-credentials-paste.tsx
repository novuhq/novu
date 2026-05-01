import { CredentialsKeyEnum } from '@novu/shared';
import { type ClipboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { RiCheckLine, RiClipboardLine, RiCloseLine, RiInformationLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Textarea } from '@/components/primitives/textarea';
import type { IntegrationFormData } from '../types';
import {
  getSlackFieldDisplayName,
  isLikelySlackCredentialsBlock,
  type ParsedSlackCredentials,
  parseSlackCredentialsBlock,
  type SlackCredentialField,
} from './parse-slack-credentials-block';

const SLACK_FIELDS: SlackCredentialField[] = [
  CredentialsKeyEnum.ApplicationId,
  CredentialsKeyEnum.ClientId,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.SigningSecret,
];

type ApplyOutcome = {
  filled: SlackCredentialField[];
  overwritten: SlackCredentialField[];
  invalid: SlackCredentialField[];
  unknownLines: string[];
};

type SlackCredentialsPasteProps = {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
};

/**
 * Smart-paste affordance for the Slack agent onboarding credentials form.
 *
 * Renders an auto-focused textarea that recognizes the freeform "App
 * Credentials" block from Slack's app settings page and routes the parsed
 * fields back into the existing react-hook-form state. Marks each filled
 * field as dirty + validated so the existing Save button enables.
 */
export function SlackCredentialsPaste({ control, setValue, isReadOnly }: SlackCredentialsPasteProps) {
  const credentials = useWatch({ control, name: 'credentials' });
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [draft, setDraft] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apply = useCallback(
    (parsed: ParsedSlackCredentials): ApplyOutcome => {
      const filled: SlackCredentialField[] = [];
      const overwritten: SlackCredentialField[] = [];

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
        unknownLines: parsed.unknownLines,
      };
    },
    [credentials, setValue]
  );

  const handleParse = useCallback(
    (text: string) => {
      const parsed = parseSlackCredentialsBlock(text);

      if (parsed.matched.length === 0) {
        setOutcome({ filled: [], overwritten: [], invalid: [], unknownLines: parsed.unknownLines });

        return;
      }

      const result = apply(parsed);
      setOutcome(result);
      setDraft('');
      setIsExpanded(false);
    },
    [apply]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const text = event.clipboardData.getData('text/plain');
      if (!isLikelySlackCredentialsBlock(text)) {
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

  if (isReadOnly) {
    return null;
  }

  return (
    <div className="border-stroke-soft bg-bg-weak text-text-sub mb-3 flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <span className="text-text-soft mt-0.5">
          <RiClipboardLine className="size-4" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-text-strong text-label-xs font-medium">Skip the four copy-pastes</p>
            <button
              type="button"
              className="text-text-soft hover:text-text-strong text-label-xs cursor-pointer font-medium underline"
              onClick={() => {
                setIsExpanded((prev) => !prev);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
            >
              {isExpanded ? 'Hide' : 'Open paste box'}
            </button>
          </div>
          <p className="text-text-soft text-label-xs">
            On Slack&apos;s App Credentials page, click <span className="font-medium">Show</span> on each secret, copy
            the whole section, and paste it anywhere below - we&apos;ll sort it out.
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onPaste={handlePaste}
            placeholder={
              'Paste the App Credentials section from Slack here.\n' +
              'Pasting straight into any field below works too.'
            }
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

      {outcome && <PasteOutcomeSummary outcome={outcome} onDismiss={dismiss} />}
    </div>
  );
}

function PasteOutcomeSummary({ outcome, onDismiss }: { outcome: ApplyOutcome; onDismiss: () => void }) {
  const noneFilled = outcome.filled.length === 0;
  const filledMissing = useMemo(
    () => SLACK_FIELDS.filter((field) => !outcome.filled.includes(field)),
    [outcome.filled]
  );

  return (
    <div className="border-stroke-soft bg-bg-white flex items-start gap-2 rounded-md border p-2">
      <span className={noneFilled ? 'text-warning-base mt-0.5' : 'text-success-base mt-0.5'}>
        {noneFilled ? <RiInformationLine className="size-4" /> : <RiCheckLine className="size-4" />}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        {noneFilled ? (
          <p className="text-text-strong text-label-xs font-medium">
            Couldn&apos;t recognize a Slack credentials block in the pasted text. Fill the fields below manually.
          </p>
        ) : (
          <p className="text-text-strong text-label-xs font-medium">
            Filled {outcome.filled.length} of {SLACK_FIELDS.length} fields
            {outcome.overwritten.length > 0
              ? ` · replaced ${outcome.overwritten.length} existing value${outcome.overwritten.length === 1 ? '' : 's'}`
              : ''}
            .
          </p>
        )}

        {!noneFilled && filledMissing.length > 0 && (
          <p className="text-text-soft text-label-xs">
            Still empty: {filledMissing.map(getSlackFieldDisplayName).join(', ')}.
          </p>
        )}

        {outcome.invalid.length > 0 && (
          <p className="text-warning-base text-label-xs">
            Double-check format: {outcome.invalid.map(getSlackFieldDisplayName).join(', ')}.
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
