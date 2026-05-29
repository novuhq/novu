import { AgentRuntimeProviderIdEnum, SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage } from '@novu/shared';
import type { CreateAgentForm, CreateAgentFormErrors } from './types';

export function validateManagedCredentialFields(fields: {
  providerId?: AgentRuntimeProviderIdEnum;
  apiKey: string;
  region?: string;
  externalWorkspaceId?: string;
}): Pick<CreateAgentFormErrors, 'apiKey' | 'region' | 'externalWorkspaceId'> {
  const errors = validateCreateAgentForm({
    name: 'x',
    identifier: 'x',
    instructions: '',
    apiKey: fields.apiKey,
    runtime: 'claude',
    isExistingMode: false,
    providerId: fields.providerId,
    region: fields.region,
    externalWorkspaceId: fields.externalWorkspaceId,
    integrationName: 'x',
  });

  return {
    apiKey: errors.apiKey,
    region: errors.region,
    externalWorkspaceId: errors.externalWorkspaceId,
  };
}

export function validateCreateAgentForm(form: CreateAgentForm): CreateAgentFormErrors {
  const errors: CreateAgentFormErrors = {};
  const isExistingMode = form.runtime === 'claude' && form.isExistingMode;
  const isAwsProvider = form.providerId === AgentRuntimeProviderIdEnum.AnthropicAws;

  if (!isExistingMode) {
    const trimmedName = form.name.trim();
    const trimmedIdentifier = form.identifier.trim();

    if (!trimmedName) errors.name = 'Name is required.';

    if (!trimmedIdentifier) {
      errors.identifier = 'Identifier is required.';
    } else if (!SLUG_IDENTIFIER_REGEX.test(trimmedIdentifier)) {
      errors.identifier = slugIdentifierFormatMessage('identifier');
    }
  }

  if (form.runtime === 'claude' && !form.integrationId) {
    if (isAwsProvider) {
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

  if (form.runtime === 'claude' && !form.integrationId && !form.integrationName?.trim()) {
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
