import { SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage } from '@novu/shared';
import type { CreateAgentForm, CreateAgentFormErrors } from './types';

export function validateCreateAgentForm(form: CreateAgentForm): CreateAgentFormErrors {
  const errors: CreateAgentFormErrors = {};
  const isExistingMode = form.runtime === 'claude' && form.isExistingMode;

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

  if (form.runtime === 'claude' && !form.apiKey.trim()) {
    errors.apiKey = 'Anthropic API key is required.';
  }

  if (isExistingMode && !form.externalAgentId?.trim()) {
    errors.externalAgentId = 'Claude Agent ID is required.';
  }

  return errors;
}

export function hasFormErrors(errors: CreateAgentFormErrors): boolean {
  return Object.values(errors).some((v) => Boolean(v));
}
