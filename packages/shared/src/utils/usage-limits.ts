import { IOrganizationUsageLimits } from '../entities/organization/organization.interface';

/** The included runs plus the on-demand limit, the included runs when pausing without one, or null for no limit. */
export function getWorkflowRunLimit(
  includedRuns: number,
  { workflowRuns: { onDemandLimit }, pauseAtLimit }: Pick<IOrganizationUsageLimits, 'workflowRuns' | 'pauseAtLimit'>
): number | null {
  if (onDemandLimit !== null) {
    return includedRuns + onDemandLimit;
  }

  return pauseAtLimit ? includedRuns : null;
}
