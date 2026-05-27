import { slugify } from '@novu/shared';
import { useId } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import { Input } from '@/components/primitives/input';
import { Textarea } from '@/components/primitives/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { RequiredFieldLabel } from './required-field-label';
import type { CreateAgentFormErrors } from './types';

type ScratchAgentFieldsProps = {
  isColumnsLayout?: boolean;
  name: string;
  identifier: string;
  instructions: string;
  errors: CreateAgentFormErrors;
  isIdentifierTouched: boolean;
  isClaudeSelected: boolean;
  disabled?: boolean;
  onNameChange: (next: string) => void;
  onIdentifierChange: (next: string) => void;
  onIdentifierTouched: () => void;
  onInstructionsChange: (next: string) => void;
  /**
   * When true, the helper text and placeholder use Claude system-prompt wording.
   */
  showClaudeSystemPromptHelper?: boolean;
};

export function ScratchAgentFields({
  isColumnsLayout = false,
  name,
  identifier,
  instructions,
  errors,
  isIdentifierTouched,
  isClaudeSelected,
  disabled,
  onNameChange,
  onIdentifierChange,
  onIdentifierTouched,
  onInstructionsChange,
  showClaudeSystemPromptHelper,
}: ScratchAgentFieldsProps) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const identifierId = `${formId}-identifier`;
  const instructionsId = `${formId}-instructions`;

  const showSystemPromptHelper = showClaudeSystemPromptHelper ?? isClaudeSelected;

  return (
    <div className="flex flex-col gap-5">
      <div className={cn('flex flex-col gap-3', !isColumnsLayout && 'sm:flex-row')}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <RequiredFieldLabel htmlFor={nameId}>Agent name</RequiredFieldLabel>
          <Input
            id={nameId}
            size="xs"
            value={name}
            onChange={(e) => {
              const nextName = e.target.value;
              onNameChange(nextName);
              if (!isIdentifierTouched) {
                onIdentifierChange(slugify(nextName));
              }
            }}
            placeholder="e.g. Wine Sommelier Agent"
            hasError={Boolean(errors.name)}
            disabled={disabled}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
          />
          {errors.name ? (
            <p id={`${nameId}-error`} className="text-error-base text-label-xs" role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-px">
            <RequiredFieldLabel htmlFor={identifierId}>Agent Identifier</RequiredFieldLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                  <RiInformation2Line className="size-3.5" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Used in code and APIs. Must be unique. Letters, numbers, hyphens, underscores, and dots only.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id={identifierId}
            size="xs"
            className="font-mono"
            value={identifier}
            onChange={(e) => {
              onIdentifierChange(e.target.value);
              onIdentifierTouched();
            }}
            placeholder="e.g. wine-sommelier-agent"
            hasError={Boolean(errors.identifier)}
            disabled={disabled}
            aria-invalid={errors.identifier ? true : undefined}
            aria-describedby={errors.identifier ? `${identifierId}-error` : undefined}
          />
          {errors.identifier ? (
            <p id={`${identifierId}-error`} className="text-error-base text-label-xs" role="alert">
              {errors.identifier}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <label htmlFor={instructionsId} className="text-text-strong text-label-xs font-medium">
            {showSystemPromptHelper ? 'Instructions' : 'Description'}
          </label>
          {showSystemPromptHelper && (
            <span className="text-text-soft text-paragraph-xs ml-auto">(Sent to Claude as the system prompt)</span>
          )}
        </div>
        <Textarea
          id={instructionsId}
          placeholder={
            showSystemPromptHelper
              ? 'You are a helpful assistant for the team. Always reply concisely\nand cite sources when you can...'
              : 'What does this agent do...'
          }
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          className="min-h-24 resize-none text-sm"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
