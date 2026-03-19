import * as Sentry from '@sentry/react';
import { CheckIntegrationResponseEnum } from '@/api/integrations';
import { showErrorToast } from '../../../../components/primitives/sonner-helpers';

function extractCheckIntegrationCode(rawError: unknown): string | undefined {
  const errorData = rawError as Record<string, unknown> | undefined;
  if (!errorData?.message || typeof errorData.message !== 'string') return undefined;

  try {
    const parsed = JSON.parse(errorData.message);

    return parsed?.code;
  } catch {
    return undefined;
  }
}

function formatValidationMessages(rawError: unknown): string | undefined {
  const errorData = rawError as Record<string, unknown> | undefined;
  if (!errorData) return undefined;

  const errors = errorData.errors as Record<string, { messages?: string[] }> | undefined;
  const generalMessages = errors?.general?.messages;

  if (Array.isArray(generalMessages) && generalMessages.length > 0) {
    return generalMessages
      .map((msg) => msg.replace(/^credentials\./, ''))
      .filter(Boolean)
      .join('. ');
  }

  if (Array.isArray(errorData.message)) {
    const messages = (errorData.message as string[])
      .map((msg) => msg.replace(/^credentials\./, ''))
      .filter(Boolean);

    return messages.length > 0 ? messages.join('. ') : undefined;
  }

  return undefined;
}

export function handleIntegrationError(error: any, operation: 'update' | 'create' | 'delete') {
  const rawError = error?.rawError;
  const checkCode = extractCheckIntegrationCode(rawError);

  if (checkCode === CheckIntegrationResponseEnum.INVALID_EMAIL) {
    showErrorToast(error.message, 'Invalid sender email');
  } else if (checkCode === CheckIntegrationResponseEnum.BAD_CREDENTIALS) {
    showErrorToast(error.message, 'Invalid credentials or credentials expired');
  } else {
    const validationMessage = formatValidationMessages(rawError);
    if (validationMessage) {
      showErrorToast(validationMessage, 'Validation Error');

      return;
    }

    Sentry.captureException(error);

    showErrorToast(
      error?.message || `There was an error ${operation}ing the integration.`,
      `Failed to ${operation} integration`
    );
  }
}
