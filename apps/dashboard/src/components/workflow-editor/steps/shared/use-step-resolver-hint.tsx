import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ExternalLink } from '@/components/shared/external-link';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const STEP_RESOLVER_DOCS_LINK = 'https://docs.novu.co/framework/content/step-resolvers';

export function useStepResolverHint(): React.ReactNode {
  const { step } = useStepEditor();
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);

  if (!isStepResolverEnabled || !step.stepResolverHash) {
    return undefined;
  }

  return (
    <>
      Step content is managed externally. <ExternalLink href={STEP_RESOLVER_DOCS_LINK}>Learn more</ExternalLink>
    </>
  );
}
