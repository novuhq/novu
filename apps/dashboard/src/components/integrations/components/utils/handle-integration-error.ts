import { CheckIntegrationResponseEnum } from '@/api/integrations';
import * as Sentry from '@sentry/react';
import { showErrorToast } from '../../../../components/primitives/sonner-helpers';

export function handleIntegrationError(error: any, operation: 'update' | 'create' | 'delete') {
  if (error?.message?.code === CheckIntegrationResponseEnum.INVALID_EMAIL) {
    showErrorToast(error.message?.message, 'Invalid sender email');
  } else if (error?.message?.code === CheckIntegrationResponseEnum.BAD_CREDENTIALS) {
    showErrorToast(error.message?.message, 'Invalid credentials or credentials expired');
  } else {
    Sentry.captureException(error);

    showErrorToast(
      error?.message?.message || error?.message || `There was an error ${operation}ing the integration.`,
      `Failed to ${operation} integration`
    );
  }
}
