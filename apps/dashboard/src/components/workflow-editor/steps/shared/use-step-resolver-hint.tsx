import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ExternalLink } from '@/components/shared/external-link';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { INLINE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';

const STEP_RESOLVER_DOCS_LINK = 'https://docs.novu.co/platform/workflow/add-and-configure-steps/code-steps';

export function useStepResolverHint(): React.ReactNode {
  const { step } = useStepEditor();
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);
  const isActionStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ACTION_STEP_RESOLVER_ENABLED);

  const isActionStep = INLINE_CONFIGURABLE_STEP_TYPES.includes(step.type);
  const isFlagEnabled = isActionStep ? isActionStepResolverEnabled : isStepResolverEnabled;

  if (!isFlagEnabled || !step.stepResolverHash) {
    return undefined;
  }

  return (
    <>
      Step content is managed externally. <ExternalLink href={STEP_RESOLVER_DOCS_LINK}>Learn more</ExternalLink>
    </>
  );
}
