import { type ChangeEvent, forwardRef, useId } from 'react';
import { RiCloseLine, RiInformation2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { GenerationStatus, type GenerationStep } from './generation-status';

const PROMPT_MAX_LENGTH = 2000;

const DEFAULT_PLACEHOLDER =
  'Review every new pull request for security issues, then post a concise risk summary as a PR comment';

type PromptInputProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  errorMessage?: string;
  placeholder?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  /**
   * When true, the textarea is read-only, the generation status animation is shown below,
   * and a Cancel button is displayed.
   */
  isGenerating?: boolean;
  /**
   * Animated status steps to render while {@link isGenerating} is true. Required when
   * `isGenerating` is true; ignored otherwise.
   */
  generationSteps?: ReadonlyArray<GenerationStep>;
  onCancelGeneration?: () => void;
  /**
   * When true, the Cancel button stays visible but is disabled. Use this once the LLM
   * call has settled and the agent is being provisioned — there is nothing to abort, but
   * removing the button would cause a layout shift.
   */
  isCancelDisabled?: boolean;
  /**
   * Helper text shown below the textarea when not generating (e.g. "You can always edit the
   * agent once created").
   */
  helperText?: string;
};

export const PromptInput = forwardRef<HTMLTextAreaElement, PromptInputProps>(
  (
    {
      value,
      onChange,
      disabled,
      errorMessage,
      placeholder = DEFAULT_PLACEHOLDER,
      textareaRef,
      isGenerating = false,
      generationSteps,
      onCancelGeneration,
      isCancelDisabled = false,
      helperText,
    },
    _ref
  ) => {
    const textareaId = useId();
    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    };

    const isTextareaDisabled = disabled || isGenerating;

    return (
      <div className="flex w-full flex-col gap-2">
        <div
          className={cn(
            'bg-bg-white shadow-regular-xs ring-stroke-soft relative flex min-h-[100px] flex-col rounded-lg p-px ring-1 ring-inset',
            'focus-within:ring-stroke-soft/50 focus-within:ring-[3px]',
            errorMessage && 'ring-error-base focus-within:ring-error-base/30',
            isTextareaDisabled && 'bg-bg-weak'
          )}
        >
          <textarea
            id={textareaId}
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            disabled={isTextareaDisabled}
            readOnly={isGenerating}
            maxLength={PROMPT_MAX_LENGTH}
            placeholder={placeholder}
            className={cn(
              'text-paragraph-xs text-text-strong placeholder:text-text-soft min-h-[98px] w-full resize-none rounded-lg bg-transparent p-3 outline-hidden',
              'disabled:text-text-strong disabled:placeholder:text-text-disabled disabled:cursor-default'
            )}
            aria-invalid={Boolean(errorMessage) || undefined}
          />
        </div>

        {errorMessage && (
          <p className="text-error-base text-label-xs flex items-center gap-1">
            <RiInformation2Line className="size-3.5" aria-hidden />
            {errorMessage}
          </p>
        )}

        {!isGenerating && helperText && (
          <p className="text-text-soft text-label-xs font-normal flex items-center gap-1 leading-4">
            <RiInformation2Line className="size-3.5" aria-hidden />
            {helperText}
          </p>
        )}

        {isGenerating && generationSteps && generationSteps.length > 0 && (
          <div className="flex flex-col gap-3">
            {onCancelGeneration && (
              <Button
                type="button"
                variant="secondary"
                mode="outline"
                size="2xs"
                className="w-fit gap-1"
                onClick={onCancelGeneration}
                disabled={isCancelDisabled}
                trailingIcon={RiCloseLine}
              >
                Cancel
              </Button>
            )}
            <GenerationStatus steps={generationSteps} />
          </div>
        )}
      </div>
    );
  }
);

PromptInput.displayName = 'PromptInput';
