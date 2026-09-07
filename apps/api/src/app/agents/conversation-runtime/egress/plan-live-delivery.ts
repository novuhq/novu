import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

interface PlanCapableAdapter {
  postObject?: (threadId: string, kind: string, model: unknown) => Promise<{ id: string; threadId: string }>;
  editObject?: (threadId: string, messageId: string, kind: string, model: unknown) => Promise<unknown>;
  editMessage?: (threadId: string, messageId: string, message: unknown) => Promise<{ id: string; threadId: string }>;
}

export type PlanDeliveryMode = 'native' | 'markdown';

const MARKDOWN_PLAN_PLATFORMS = new Set<AgentPlatformEnum>([
  AgentPlatformEnum.TELEGRAM,
  AgentPlatformEnum.TEAMS,
]);

export function resolvePlanDeliveryMode(platform: string, adapter: PlanCapableAdapter): PlanDeliveryMode | null {
  if (typeof adapter.postObject === 'function' && typeof adapter.editObject === 'function') {
    return 'native';
  }

  if (!MARKDOWN_PLAN_PLATFORMS.has(platform as AgentPlatformEnum)) {
    return null;
  }

  if (typeof adapter.editMessage !== 'function') {
    return null;
  }

  return 'markdown';
}

export function supportsLivePlanDelivery(platform: string, adapter: PlanCapableAdapter): boolean {
  return resolvePlanDeliveryMode(platform, adapter) !== null;
}
