import { useEffect, useState } from 'react';
import { OnboardingLoader } from '@/components/onboarding/onboarding-loader';
import { isConnectProvisioningActive, subscribeConnectProvisioningChange } from '@/utils/connect';

const AUTH_BACKGROUND_CLASS =
  "bg-[url('/images/auth/background.svg')] bg-cover bg-no-repeat bg-center";

/**
 * Single full-screen Connect provisioning state ("Build and distribute agents") that stays
 * mounted across org-list → agent-setup so the background and loader never swap mid-flow.
 */
export function ConnectProvisioningOverlay() {
  const [visible, setVisible] = useState(isConnectProvisioningActive);

  useEffect(() => {
    const sync = () => setVisible(isConnectProvisioningActive());

    sync();

    return subscribeConnectProvisioningChange(sync);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center ${AUTH_BACKGROUND_CLASS}`}>
      <OnboardingLoader variant="connect" />
    </div>
  );
}
