export function generateStepResolverWorkerId(organizationId: string, stepResolverHash: string): string {
  return `sr-${organizationId}-${stepResolverHash}`;
}
