import { EnvironmentId, OrganizationId } from '@novu/shared';

/**
 * Generates a standardized app ID format for webhook applications
 * Format: o-${organizationId}-e-${environmentId}
 */
export function generateWebhookAppId(organizationId: OrganizationId, environmentId: EnvironmentId): string {
  return `o-${organizationId}-e-${environmentId}`;
}
