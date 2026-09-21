import {
  AGENT_IDENTIFIER_MAX_LENGTH,
  AGENT_NAME_MAX_LENGTH,
  AgentRuntimeProviderIdEnum,
  isGoogleAgentRuntimeProvider,
  SLUG_IDENTIFIER_REGEX,
  slugIdentifierFormatMessage,
} from '@novu/shared';
import { isManagedConnectorRuntime } from '@/components/agents/connectors/connector-options';
import type { CreateAgentForm, CreateAgentFormErrors } from './types';

export function validateManagedCredentialFields(fields: {
  providerId?: AgentRuntimeProviderIdEnum;
  apiKey: string;
  region?: string;
  externalWorkspaceId?: string;
  projectName?: string;
  instanceId?: string;
}): Pick<CreateAgentFormErrors, 'apiKey' | 'region' | 'externalWorkspaceId' | 'projectName' | 'instanceId'> {
  const isGoogle = fields.providerId != null && isGoogleAgentRuntimeProvider(fields.providerId);
  const errors = validateCreateAgentForm({
    name: 'x',
    identifier: 'x',
    description: '',
    instructions: '',
    apiKey: fields.apiKey,
    runtime: isGoogle ? 'vertex' : 'claude',
    isExistingMode: false,
    providerId: fields.providerId,
    region: fields.region,
    externalWorkspaceId: fields.externalWorkspaceId,
    projectName: fields.projectName,
    instanceId: fields.instanceId,
    integrationName: 'x',
  });

  return {
    apiKey: errors.apiKey,
    region: errors.region,
    externalWorkspaceId: errors.externalWorkspaceId,
    projectName: errors.projectName,
    instanceId: errors.instanceId,
  };
}

export function validateCreateAgentForm(form: CreateAgentForm): CreateAgentFormErrors {
  const errors: CreateAgentFormErrors = {};
  const isExistingMode = form.runtime === 'claude' && form.isExistingMode;
  const isAwsProvider = form.providerId === AgentRuntimeProviderIdEnum.AnthropicAws;
  const isGoogleProvider = form.providerId != null && isGoogleAgentRuntimeProvider(form.providerId);
  const isManagedRuntime = isManagedConnectorRuntime(form.runtime);

  if (!isExistingMode) {
    const trimmedName = form.name.trim();
    const trimmedIdentifier = form.identifier.trim();

    if (!trimmedName) {
      errors.name = 'Name is required.';
    } else if (trimmedName.length > AGENT_NAME_MAX_LENGTH) {
      errors.name = `Name must be ${AGENT_NAME_MAX_LENGTH} characters or fewer.`;
    }

    if (!trimmedIdentifier) {
      errors.identifier = 'Identifier is required.';
    } else if (trimmedIdentifier.length > AGENT_IDENTIFIER_MAX_LENGTH) {
      errors.identifier = `Identifier must be ${AGENT_IDENTIFIER_MAX_LENGTH} characters or fewer.`;
    } else if (!SLUG_IDENTIFIER_REGEX.test(trimmedIdentifier)) {
      errors.identifier = slugIdentifierFormatMessage('identifier');
    }
  }

  if (isManagedRuntime && !form.integrationId) {
    if (isGoogleProvider) {
      if (!form.projectName?.trim()) {
        errors.projectName = 'GCP Project ID is required.';
      }

      if (!form.instanceId?.trim()) {
        errors.instanceId = 'Engine ID is required.';
      }
    } else if (isAwsProvider) {
      if (!form.region?.trim()) {
        errors.region = 'AWS region is required.';
      }

      if (!form.externalWorkspaceId?.trim()) {
        errors.externalWorkspaceId = 'Workspace ID is required.';
      }

      if (!form.apiKey.trim()) {
        errors.apiKey = 'AWS API key is required.';
      }
    } else if (!form.apiKey.trim()) {
      errors.apiKey = 'Anthropic API key is required.';
    }
  }

  if (isManagedRuntime && !form.integrationId && !form.integrationName?.trim()) {
    errors.integrationName = 'Integration name is required.';
  }

  if (isExistingMode && !form.externalAgentId?.trim()) {
    errors.externalAgentId = 'Claude Agent ID is required.';
  }

  return errors;
}

export function hasFormErrors(errors: CreateAgentFormErrors): boolean {
  return Object.values(errors).some((v) => Boolean(v));
}
