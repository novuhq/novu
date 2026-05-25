import { AWS_CLAUDE_COMMERCIAL_REGIONS } from '@novu/shared';
import { useId, useState } from 'react';
import { RiArrowRightUpLine, RiEyeLine, RiEyeOffLine, RiInformation2Line } from 'react-icons/ri';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import {
  AWS_CLAUDE_API_KEYS_HREF,
  AWS_CLAUDE_SETUP_HREF,
  type CreateAgentFormErrors,
} from './types';

type AwsClaudeCredentialsFieldsProps = {
  region: string;
  externalWorkspaceId: string;
  apiKey: string;
  errors: CreateAgentFormErrors;
  disabled?: boolean;
  onRegionChange: (next: string) => void;
  onExternalWorkspaceIdChange: (next: string) => void;
  onApiKeyChange: (next: string) => void;
};

export function AwsClaudeCredentialsFields({
  region,
  externalWorkspaceId,
  apiKey,
  errors,
  disabled,
  onRegionChange,
  onExternalWorkspaceIdChange,
  onApiKeyChange,
}: AwsClaudeCredentialsFieldsProps) {
  const formId = useId();
  const regionId = `${formId}-region`;
  const workspaceIdInputId = `${formId}-workspace-id`;
  const apiKeyId = `${formId}-api-key`;
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor={regionId} className="text-text-sub text-label-xs font-medium">
          AWS Region
        </label>
        <select
          id={regionId}
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          disabled={disabled}
          className="border-stroke-soft bg-bg-white text-text-strong h-8 rounded-md border px-2 text-label-xs"
        >
          <option value="">Select a region…</option>
          {AWS_CLAUDE_COMMERCIAL_REGIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {errors.region ? (
          <p className="text-error-base text-label-xs" role="alert">
            {errors.region}
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
              Required for Claude Platform on AWS. Find your `wrkspc_…` id under Workspaces in the AWS Console.
            </TooltipContent>
          </Tooltip>
          <div className="ml-auto">
            <a
              href={AWS_CLAUDE_SETUP_HREF}
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
          value={externalWorkspaceId}
          onChange={(e) => onExternalWorkspaceIdChange(e.target.value)}
          placeholder="wrkspc_..."
          className="font-mono"
          disabled={disabled}
          hasError={Boolean(errors.externalWorkspaceId)}
        />
        {errors.externalWorkspaceId ? (
          <p className="text-error-base text-label-xs" role="alert">
            {errors.externalWorkspaceId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-px">
          <label htmlFor={apiKeyId} className="text-text-sub text-label-xs font-medium">
            AWS API Key
          </label>
          <div className="ml-auto">
            <a
              href={AWS_CLAUDE_API_KEYS_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
            >
              Generate API Key
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
          placeholder="Paste the AWS Claude Platform API key..."
          hasError={Boolean(errors.apiKey)}
          disabled={disabled}
          className="font-mono"
          inlineTrailingNode={
            <button
              type="button"
              onClick={() => setShowSecret((prev) => !prev)}
              aria-label={showSecret ? 'Hide API key' : 'Show API key'}
            >
              {showSecret ? <RiEyeOffLine className="text-text-sub" /> : <RiEyeLine className="text-text-sub" />}
            </button>
          }
        />
        {errors.apiKey ? (
          <p className="text-error-base text-label-xs" role="alert">
            {errors.apiKey}
          </p>
        ) : null}
      </div>
    </div>
  );
}
