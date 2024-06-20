import { useStudioState } from './StudioStateProvider';
import { PrivatePageLayout } from '../components/layout/components/PrivatePageLayout';
import { LocalStudioPageLayout } from '../components/layout/components/LocalStudioPageLayout';

export function StudioPageLayout() {
  const state = useStudioState();

  if (state?.local) {
    return <LocalStudioPageLayout />;
  }

  return <PrivatePageLayout />;
}
