import { useId, useState } from 'react';
import { RiArrowRightUpLine, RiEyeLine, RiEyeOffLine, RiInformation2Line } from 'react-icons/ri';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import {
  ANTHROPIC_API_KEY_HREF,
  CLAUDE_WORKSPACE_HREF,
  type CreateAgentFormErrors,
  DEFAULT_CLAUDE_WORKSPACE_ID,
} from './types';

type ClaudeCredentialsFieldsProps = {
  apiKey: string;
  workspaceId: string;
  errors: CreateAgentFormErrors;
  disabled?: boolean;
  onApiKeyChange: (next: string) => void;
  onWorkspaceIdChange: (next: string) => void;
};

export function ClaudeCredentialsFields({
  apiKey,
  workspaceId,
  errors,
  disabled,
  onApiKeyChange,
  onWorkspaceIdChange,
}: ClaudeCredentialsFieldsProps) {
  const formId = useId();
  const apiKeyId = `${formId}-api-key`;
  const workspaceIdInputId = `${formId}-workspace-id`;
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-px">
          <label htmlFor={apiKeyId} className="text-text-sub text-label-xs font-medium">
            Anthropic API key
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                <RiInformation2Line className="size-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Your Anthropic API key is encrypted and stored securely. It is used to provision the agent on Claude
              Platform.
            </TooltipContent>
          </Tooltip>
          <div className="ml-auto">
            <a
              href={ANTHROPIC_API_KEY_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
            >
              Get API Key
              <RiArrowRightUpLine className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <Input
          id={apiKeyId}
          size="xs"
          type={showSecret ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Paste the Anthropic API key here..."
          hasError={Boolean(errors.apiKey)}
          disabled={disabled}
          aria-invalid={errors.apiKey ? true : undefined}
          aria-describedby={errors.apiKey ? `${apiKeyId}-error` : undefined}
          className="font-mono"
          inlineTrailingNode={
            <button
              type="button"
              onClick={() => setShowSecret((prev) => !prev)}
              aria-label={showSecret ? 'Hide API key' : 'Show API key'}
              aria-pressed={showSecret}
              disabled={disabled}
            >
              {showSecret ? (
                <RiEyeOffLine className="text-text-sub group-has-[disabled]:text-text-disabled" />
              ) : (
                <RiEyeLine className="text-text-sub group-has-[disabled]:text-text-disabled" />
              )}
            </button>
          }
        />
        {errors.apiKey ? (
          <p id={`${apiKeyId}-error`} className="text-error-base text-label-xs" role="alert">
            {errors.apiKey}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-px">
          <label htmlFor={workspaceIdInputId} className="text-text-sub text-label-xs font-medium">
            Workspace ID
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                <RiInformation2Line className="size-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              The Anthropic workspace your API key is scoped to. Leave empty for the Default Workspace. For custom
              workspaces, paste the `wrkspc_…` id from the Claude Console (Settings → Workspaces). Used for the
              in-product &quot;Open in Claude&quot; deep link.
            </TooltipContent>
          </Tooltip>
          <div className="ml-auto">
            <a
              href={CLAUDE_WORKSPACE_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
            >
              Find Workspace ID
              <RiArrowRightUpLine className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <Input
          id={workspaceIdInputId}
          size="xs"
          value={workspaceId}
          onChange={(e) => onWorkspaceIdChange(e.target.value)}
          placeholder={DEFAULT_CLAUDE_WORKSPACE_ID}
          className="font-mono"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
