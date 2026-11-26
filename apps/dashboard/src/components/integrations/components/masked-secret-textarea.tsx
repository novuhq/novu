import { useId, useRef, useState } from 'react';
import type { Control, RegisterOptions } from 'react-hook-form';
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { Textarea } from '@/components/primitives/textarea';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';

type CredentialFieldName = `credentials.${string}`;

/**
 * A multi-line secret pasted in, such as a key file. Once it holds a value it shows `mask(value)`, with the secret
 * part hidden; the eye shows the whole text to edit it. It masks again on blur.
 */
export function MaskedSecretTextarea({
  control,
  name,
  label,
  rules,
  mask,
  placeholder,
  secretName,
  rows = 8,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  name: CredentialFieldName;
  label: string;
  rules: RegisterOptions<IntegrationFormData, CredentialFieldName>;
  mask: (value: string) => string;
  placeholder: string;
  /** Names the secret for screen readers, as in "Show the <secretName>". */
  secretName: string;
  rows?: number;
  isReadOnly?: boolean;
}) {
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
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
            aria-label={isMasked ? `Show the ${secretName}` : `Hide the ${secretName}`}
            // Keeps focus in the textarea, so its blur doesn't hide it first and the click show it again.
            onMouseDown={(event) => event.preventDefault()}
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
                  aria-label={`${label}, hidden. Show it to edit.`}
                  className={cn(
                    'bg-bg-white border-stroke-soft font-code text-text-strong w-full overflow-hidden whitespace-pre-wrap break-all rounded-md border p-2 pr-7 text-left text-[12px] font-medium leading-5 shadow-xs',
                    fieldState.error && 'border-error-base'
                  )}
                >
                  {mask(value)}
                </button>
              ) : (
                <FormControl>
                  <Textarea
                    ref={textareaRef}
                    id={inputId}
                    simple
                    rows={rows}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder={placeholder}
                    value={value}
                    onChange={field.onChange}
                    // While the field has focus it stays a textarea, so typing isn't cut off; it masks on blur.
                    onFocus={() => setIsRevealed(true)}
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
