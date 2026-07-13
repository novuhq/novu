import { useId } from 'react';
import { RiArrowRightUpLine, RiInformation2Line } from 'react-icons/ri';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { CLAUDE_AGENT_ID_HREF, CLAUDE_ENVIRONMENT_ID_HREF, type CreateAgentFormErrors } from './types';

type ExistingAgentFieldsProps = {
  externalAgentId: string;
  externalEnvironmentId: string;
  errors: CreateAgentFormErrors;
  disabled?: boolean;
  onExternalAgentIdChange: (next: string) => void;
  onExternalEnvironmentIdChange: (next: string) => void;
};

export function ExistingAgentFields({
  externalAgentId,
  externalEnvironmentId,
  errors,
  disabled,
  onExternalAgentIdChange,
  onExternalEnvironmentIdChange,
}: ExistingAgentFieldsProps) {
  const formId = useId();
  const agentIdInputId = `${formId}-external-id`;
  const environmentIdInputId = `${formId}-external-env-id`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-px">
          <label htmlFor={agentIdInputId} className="text-text-strong text-label-xs font-medium">
            Claude Agent ID
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                <RiInformation2Line className="size-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>The unique identifier of the agent on the Claude Platform (e.g. agent_xxx).</TooltipContent>
          </Tooltip>
          <div className="ml-auto">
            <a
              href={CLAUDE_AGENT_ID_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
            >
              Get Agent ID
              <RiArrowRightUpLine className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <Input
          id={agentIdInputId}
          size="xs"
          value={externalAgentId}
          onChange={(e) => onExternalAgentIdChange(e.target.value)}
          placeholder="e.g. agent_xx"
          className="font-mono"
          hasError={Boolean(errors.externalAgentId)}
          disabled={disabled}
          aria-invalid={errors.externalAgentId ? true : undefined}
          aria-describedby={errors.externalAgentId ? `${agentIdInputId}-error` : undefined}
        />
        {errors.externalAgentId ? (
          <p id={`${agentIdInputId}-error`} className="text-error-base text-label-xs" role="alert">
            {errors.externalAgentId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-px">
          <label htmlFor={environmentIdInputId} className="text-text-strong text-label-xs font-medium">
            Claude Environment ID <span className="text-text-soft">(Optional)</span>
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                <RiInformation2Line className="size-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>The Claude environment that hosts this agent (e.g. env_xxx).</TooltipContent>
          </Tooltip>
          <div className="ml-auto">
            <a
              href={CLAUDE_ENVIRONMENT_ID_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
            >
              Get Environment ID
              <RiArrowRightUpLine className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <Input
          id={environmentIdInputId}
          size="xs"
          value={externalEnvironmentId}
          onChange={(e) => onExternalEnvironmentIdChange(e.target.value)}
          placeholder="e.g. env_xx"
          className="font-mono"
          hasError={Boolean(errors.externalEnvironmentId)}
          disabled={disabled}
          aria-invalid={errors.externalEnvironmentId ? true : undefined}
          aria-describedby={errors.externalEnvironmentId ? `${environmentIdInputId}-error` : undefined}
        />
        {errors.externalEnvironmentId ? (
          <p id={`${environmentIdInputId}-error`} className="text-error-base text-label-xs" role="alert">
            {errors.externalEnvironmentId}
          </p>
        ) : null}
      </div>
    </div>
  );
}
