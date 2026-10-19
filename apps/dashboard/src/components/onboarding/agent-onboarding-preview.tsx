import { AgentPreviewFeatureList } from '@/components/onboarding/agent-preview-feature-list';
import { AgentUsecasePreviewIllustration } from '@/components/onboarding/agent-usecase-preview-illustration';

/** Right-rail agent illustration + feature bullets shared by Conversations onboarding steps. */
export function AgentOnboardingPreview() {
  return (
    <div className="flex flex-col items-start">
      <div className="self-center">
        <AgentUsecasePreviewIllustration />
      </div>
      <div className="mt-10">
        <AgentPreviewFeatureList />
      </div>
    </div>
  );
}
