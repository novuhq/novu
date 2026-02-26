import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ExternalLink } from '@/components/shared/external-link';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const REACT_EMAIL_DOCS_LINK = 'https://docs.novu.co/framework/content/react-email';

export function useReactEmailStepHint(): React.ReactNode {
  const { controlValues } = useStepEditor();
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);
  const values = (controlValues ?? {}) as Record<string, unknown>;
  const rendererType = values.rendererType;
  const stepResolverHash = values.stepResolverHash;

  if (!isStepResolverEnabled || rendererType !== 'react-email') return undefined;

  if (!stepResolverHash) {
    return 'Publish your React Email workflow via the CLI to enable editing.';
  }

  return (
    <>
      Step content is managed externally. <ExternalLink href={REACT_EMAIL_DOCS_LINK}>Learn more</ExternalLink>
    </>
  );
}
