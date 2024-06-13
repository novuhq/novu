export type PlanType = 'plan' | 'free' | 'business' | 'enterprise';

export const PLANS_COLUMN_WIDTH: Record<PlanType, string> = Object.freeze({
  plan: '20%',
  free: '17%',
  business: '35%',
  enterprise: '28%',
});
