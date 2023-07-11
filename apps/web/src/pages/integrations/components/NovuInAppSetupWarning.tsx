import type { IIntegratedProvider } from '../IntegrationsStoreModal';
import { SetupWarning } from './SetupWarning';
import { useInAppActivated } from '../../../api/hooks';

export const NovuInAppSetupWarning = ({ provider }: { provider: IIntegratedProvider | null }) => {
  const { isInAppActive } = useInAppActivated();

  if (!provider) return null;

  return (
    <SetupWarning
      show={!isInAppActive}
      message="Select a framework to set up credentials to start sending notifications."
      docReference={provider.docReference}
    />
  );
};
