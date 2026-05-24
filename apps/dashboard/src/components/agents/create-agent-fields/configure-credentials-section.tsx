import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { useId, useState } from 'react';
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiRefreshLine,
} from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { Input } from '@/components/primitives/input';
import { cn } from '@/utils/ui';
import {
  ANTHROPIC_API_KEY_HREF,
  CLAUDE_WORKSPACE_HREF,
  type CreateAgentFormErrors,
  DEFAULT_CLAUDE_WORKSPACE_ID,
} from './types';

export type VerifyStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

type ConfigureCredentialsSectionProps = {
  providerId: AgentRuntimeProviderIdEnum;
  providerLabel: string;
  integrationName: string;
  apiKey: string;
  externalWorkspaceId?: string;
  errors: CreateAgentFormErrors;
  disabled?: boolean;
  status: VerifyStatus;
  statusMessage?: string;
  isSaving?: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onIntegrationNameChange: (next: string) => void;
  onApiKeyChange: (next: string) => void;
  onExternalWorkspaceIdChange: (next: string) => void;
  onVerify: (apiKey: string) => void;
  onSave: () => void;
};

function StatusRow({ status, message }: { status: VerifyStatus; message?: string }) {
  if (status === 'idle') {
    return (
      <span className="text-text-soft inline-flex items-center gap-1 text-label-xs leading-4">
        <RiAlertLine className="text-warning-base min-w-3.5 size-3.5" aria-hidden />
        Missing
      </span>
    );
  }

  if (status === 'verifying') {
    return (
      <span className="text-text-soft inline-flex items-center gap-1 text-label-xs leading-4">
        <RiLoader4Line className="text-text-soft min-w-3.5 size-3.5 animate-spin" aria-hidden />
        Verifying…
      </span>
    );
  }

  if (status === 'valid') {
    return (
      <span className="text-success-base inline-flex items-center gap-1 text-label-xs leading-4">
        <span className="bg-success-base flex min-w-3.5 size-3.5 items-center justify-center rounded-full">
          <RiCheckLine className="text-static-white size-2.5" aria-hidden />
        </span>
        Valid
      </span>
    );
  }

  return (
    <span className="text-error-base inline-flex items-center gap-1 text-label-xs leading-4 overflow-hidden">
      <RiAlertLine className="text-error-base min-w-3.5 size-3.5" aria-hidden />
      <span className="truncate max-w-80" title={message || 'Invalid'}>
        {message || 'Invalid'}
      </span>
    </span>
  );
}

export function ConfigureCredentialsSection({
  providerLabel,
  integrationName,
  apiKey,
  externalWorkspaceId,
  errors,
  disabled,
  status,
  statusMessage,
  isSaving,
  expanded,
  onExpandedChange,
  onIntegrationNameChange,
  onApiKeyChange,
  onExternalWorkspaceIdChange,
  onVerify,
  onSave,
}: ConfigureCredentialsSectionProps) {
  const fieldId = useId();
  const integrationNameId = `${fieldId}-integration-name`;
  const apiKeyId = `${fieldId}-api-key`;
  const workspaceIdInputId = `${fieldId}-workspace-id`;
  const contentId = `${fieldId}-content`;
  const [showSecret, setShowSecret] = useState(false);

  const handleVerifyClick = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    onVerify(trimmed);
  };

  const canSave = integrationName.trim().length > 0 && apiKey.trim().length > 0;

  return (
    <Collapsible
      open={expanded}
      onOpenChange={onExpandedChange}
      className="bg-bg-weak border-stroke-soft flex flex-col rounded-lg border"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-text-strong text-label-xs font-medium leading-4">Configure credentials</span>
        <div className="flex items-center gap-1.5">
          {expanded ? (
            <Button
              type="button"
              variant="secondary"
              mode="outline"
              size="2xs"
              disabled={disabled || !canSave || isSaving}
              isLoading={isSaving}
              trailingIcon={RiCheckLine}
              onClick={onSave}
            >
              Save integration
            </Button>
          ) : null}
          <CollapsibleTrigger asChild>
            <CompactButton
              type="button"
              variant="ghost"
              size="sm"
              className="text-icon-soft"
              icon={expanded ? RiArrowUpSLine : RiArrowDownSLine}
              aria-controls={contentId}
              aria-label={expanded ? 'Collapse credentials' : 'Expand credentials'}
            >
              <span className="sr-only">{expanded ? 'Collapse credentials' : 'Expand credentials'}</span>
            </CompactButton>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="bg-stroke-soft h-px w-full" />
        <div id={contentId} className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={integrationNameId} className="text-text-sub text-label-xs font-medium">
              Integration name
            </label>
            <Input
              id={integrationNameId}
              size="xs"
              value={integrationName}
              placeholder={`${providerLabel} 1`}
              disabled={disabled}
              hasError={Boolean(errors.integrationName)}
              aria-invalid={errors.integrationName ? true : undefined}
              aria-describedby={errors.integrationName ? `${integrationNameId}-error` : undefined}
              onChange={(e) => onIntegrationNameChange(e.target.value)}
            />
            {errors.integrationName ? (
              <p id={`${integrationNameId}-error`} className="text-error-base text-label-xs" role="alert">
                {errors.integrationName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-px">
              <label htmlFor={apiKeyId} className="text-text-sub text-label-xs font-medium">
                {providerLabel} API key
              </label>
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
              placeholder={`Paste the ${providerLabel} API key here…`}
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

            <div className="flex items-center gap-1.5 overflow-hidden pt-1">
              <StatusRow status={status} message={statusMessage} />
              <span className="text-text-soft text-label-xs leading-4" aria-hidden>
                ·
              </span>
              <button
                type="button"
                disabled={disabled || !apiKey.trim()}
                onClick={handleVerifyClick}
                className={cn(
                  'text-text-soft hover:text-text-sub inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 disabled:opacity-60'
                )}
              >
                Verify connection
                <RiRefreshLine className="min-w-3.5 size-3.5" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-px">
              <label htmlFor={workspaceIdInputId} className="text-text-sub text-label-xs font-medium">
                Workspace ID
              </label>
              <span className="text-text-soft text-label-xs ml-1 leading-4">(Optional)</span>
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
              value={externalWorkspaceId ?? ''}
              onChange={(e) => onExternalWorkspaceIdChange(e.target.value)}
              placeholder={DEFAULT_CLAUDE_WORKSPACE_ID}
              className="font-mono"
              disabled={disabled}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
