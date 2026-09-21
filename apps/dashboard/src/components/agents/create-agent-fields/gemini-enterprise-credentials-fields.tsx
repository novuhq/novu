import { useId } from 'react';
import { Input } from '@/components/primitives/input';
import { type CreateAgentFormErrors } from './types';

type GeminiEnterpriseCredentialsFieldsProps = {
  projectName: string;
  instanceId: string;
  region: string;
  errors: CreateAgentFormErrors;
  disabled?: boolean;
  onProjectNameChange: (next: string) => void;
  onInstanceIdChange: (next: string) => void;
  onRegionChange: (next: string) => void;
};

export function GeminiEnterpriseCredentialsFields({
  projectName,
  instanceId,
  region,
  errors,
  disabled,
  onProjectNameChange,
  onInstanceIdChange,
  onRegionChange,
}: GeminiEnterpriseCredentialsFieldsProps) {
  const formId = useId();
  const projectNameId = `${formId}-project-name`;
  const instanceIdInputId = `${formId}-instance-id`;
  const regionId = `${formId}-region`;

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
    </div>
  );
}
