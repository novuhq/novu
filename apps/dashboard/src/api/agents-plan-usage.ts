import type { ResourceLimitSource } from '@novu/shared';

/**
 * Per-environment usage of a plan-limited resource (agents, active channels)
 * against the organization plan limit. Promoted (synced) production copies do
 * not consume a second plan slot.
 */
export type PlanUsage = {
  used: number;
  limit: number;
};

/** Agent plan usage, extended with the hard creation cap. */
export type AgentPlanUsage = PlanUsage & {
  /** Total agents in the environment, including inactive ones. */
  totalCreated: number;
  /** Hard cap on total agents the organization can create per environment. */
  creationLimit: number;
  limitSource: ResourceLimitSource;
};
