import { useId } from 'react';
import { Input } from '@/components/primitives/input';
import { type CreateAgentFormErrors } from './types';

type GeminiEnterpriseCredentialsFieldsProps = {
  projectName: string;
  instanceId: string;
  region: string;
  agentId: string;
  errors: CreateAgentFormErrors;
  disabled?: boolean;
  onProjectNameChange: (next: string) => void;
  onInstanceIdChange: (next: string) => void;
  onRegionChange: (next: string) => void;
  onAgentIdChange: (next: string) => void;
};

export function GeminiEnterpriseCredentialsFields({
  projectName,
  instanceId,
  region,
  agentId,
  errors,
  disabled,
  onProjectNameChange,
  onInstanceIdChange,
  onRegionChange,
  onAgentIdChange,
}: GeminiEnterpriseCredentialsFieldsProps) {
  const formId = useId();
  const projectNameId = `${formId}-project-name`;
  const instanceIdInputId = `${formId}-instance-id`;
  const regionId = `${formId}-region`;
  const agentIdInputId = `${formId}-agent-id`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={projectNameId} className="text-text-sub text-label-xs font-medium">
          GCP Project ID
        </label>
        <Input
          id={projectNameId}
          size="xs"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="my-gcp-project"
          hasError={Boolean(errors.projectName)}
          disabled={disabled}
          className="font-mono"
        />
        {errors.projectName ? (
          <p className="text-error-base text-label-xs" role="alert">
            {errors.projectName}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={instanceIdInputId} className="text-text-sub text-label-xs font-medium">
          Engine ID
        </label>
        <Input
          id={instanceIdInputId}
          size="xs"
          value={instanceId}
          onChange={(e) => onInstanceIdChange(e.target.value)}
          placeholder="gemini-enterprise-..."
          hasError={Boolean(errors.instanceId)}
          disabled={disabled}
          className="font-mono"
        />
        {errors.instanceId ? (
          <p className="text-error-base text-label-xs" role="alert">
            {errors.instanceId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={regionId} className="text-text-sub text-label-xs font-medium">
          Location <span className="text-text-soft">(Optional)</span>
        </label>
        <Input
          id={regionId}
          size="xs"
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          placeholder="global"
          disabled={disabled}
          className="font-mono"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={agentIdInputId} className="text-text-sub text-label-xs font-medium">
          Agent ID <span className="text-text-soft">(Optional)</span>
        </label>
        <Input
          id={agentIdInputId}
          size="xs"
          value={agentId}
          onChange={(e) => onAgentIdChange(e.target.value)}
          placeholder="deep_research"
          disabled={disabled}
          className="font-mono"
        />
        <p className="text-text-soft text-label-xs">
          Registered agent within the engine (Discovery Engine console → App → Agents). Leave blank to
          use the assistant’s default behavior.
        </p>
      </div>
    </div>
  );
}
