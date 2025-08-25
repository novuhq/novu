import { useEffect, useState } from 'react';
import { IntegrationStep } from '../../types';

type UseSidebarNavigationManagerProps = {
  isOpened: boolean;
  initialProviderId?: string;
  onIntegrationSelect?: (integrationId: string) => void;
  onBack?: () => void;
};

export function useSidebarNavigationManager({
  isOpened,
  initialProviderId,
  onIntegrationSelect: externalOnIntegrationSelect,
  onBack: externalOnBack,
}: UseSidebarNavigationManagerProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<string>();
  const [step, setStep] = useState<IntegrationStep>('select');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpened) {
      if (initialProviderId) {
        setSelectedIntegration(initialProviderId);
        setStep('configure');
      } else {
        setSelectedIntegration(undefined);
        setStep('select');
      }

      setSearchQuery('');
    }
  }, [isOpened, initialProviderId]);

  const handleIntegrationSelect = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setStep('configure');
    externalOnIntegrationSelect?.(integrationId);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedIntegration(undefined);
    externalOnBack?.();
  };

  return {
    selectedIntegration,
    step,
    searchQuery,
    setSearchQuery,
    onIntegrationSelect: handleIntegrationSelect,
    onBack: handleBack,
  };
}
