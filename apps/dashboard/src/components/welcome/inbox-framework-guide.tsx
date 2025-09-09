import { IEnvironment } from '@novu/shared';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { Framework, getFrameworks } from './framework-guides.instructions';
import { FrameworkGrid } from './inbox-framework-guide/framework-grid';
import { HeaderSection } from './inbox-framework-guide/header-section';
import { updateFrameworkCode } from './inbox-framework-guide/helpers';
import { InstructionsPanel } from './inbox-framework-guide/instructions-panel';
import type { InstallationMethod } from './inbox-framework-guide/types';

const FRAMEWORKS_WITH_MANUAL_ONLY = ['Remix', 'Native', 'Angular', 'JavaScript'];
const FRAMEWORKS_WITH_INSTALLATION_TABS = ['Next.js', 'React'];

const CONTAINER_VARIANTS = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

interface InboxFrameworkGuideProps {
  currentEnvironment: IEnvironment | undefined;
  subscriberId: string;
  primaryColor: string;
  foregroundColor: string;
  backendUrl?: string;
  socketUrl?: string;
}

export function InboxFrameworkGuide({
  currentEnvironment,
  subscriberId,
  primaryColor,
  foregroundColor,
}: InboxFrameworkGuideProps) {
  const track = useTelemetry();

  const [selectedFrameworkName, setSelectedFrameworkName] = useState<string>(() => {
    const initial = getFrameworks('ai-assist');
    return initial.find((f) => f.selected)?.name || initial[0]?.name || '';
  });
  const [installationMethod, setInstallationMethod] = useState<InstallationMethod>('ai-assist');

  const effectiveInstallationMethod = useMemo<InstallationMethod>(
    () => (FRAMEWORKS_WITH_MANUAL_ONLY.includes(selectedFrameworkName) ? 'manual' : installationMethod),
    [selectedFrameworkName, installationMethod]
  );

  const frameworks = useMemo(() => getFrameworks(effectiveInstallationMethod), [effectiveInstallationMethod]);
  const updatedFrameworks = useMemo(() => {
    if (!currentEnvironment?.identifier || !subscriberId) return frameworks;
    return frameworks.map((framework) =>
      updateFrameworkCode(framework, currentEnvironment.identifier, subscriberId, primaryColor, foregroundColor)
    );
  }, [frameworks, currentEnvironment?.identifier, subscriberId, primaryColor, foregroundColor]);

  const selectedFramework = useMemo(
    () => updatedFrameworks.find((f) => f.name === selectedFrameworkName) || updatedFrameworks[0],
    [updatedFrameworks, selectedFrameworkName]
  );

  useEffect(() => {
    if (FRAMEWORKS_WITH_MANUAL_ONLY.includes(selectedFrameworkName)) {
      setInstallationMethod('manual');
    }
  }, [selectedFrameworkName]);

  const handleFrameworkSelect = useCallback(
    (framework: Framework) => {
      track(TelemetryEvent.INBOX_FRAMEWORK_SELECTED, { framework: framework.name });
      setSelectedFrameworkName(framework.name);

      if (FRAMEWORKS_WITH_MANUAL_ONLY.includes(framework.name)) {
        setInstallationMethod('manual');
      } else if (FRAMEWORKS_WITH_INSTALLATION_TABS.includes(framework.name)) {
        setInstallationMethod('ai-assist');
      }
    },
    [track]
  );

  const handleInstallationMethodChange = useCallback((method: InstallationMethod) => {
    setInstallationMethod(method);
  }, []);

  const showInstallationTabs = useMemo(
    () => FRAMEWORKS_WITH_INSTALLATION_TABS.includes(selectedFrameworkName),
    [selectedFrameworkName]
  );

  return (
    <>
      <HeaderSection />

      <motion.div variants={CONTAINER_VARIANTS} initial="hidden" animate="show" className="flex flex-col gap-6 px-6">
        <div className="flex flex-col gap-4">
          <FrameworkGrid
            frameworks={frameworks}
            selectedFrameworkName={selectedFrameworkName}
            onSelect={handleFrameworkSelect}
          />
        </div>

        <div className="flex flex-col gap-3">
          <InstructionsPanel
            selectedFramework={selectedFramework}
            installationMethod={effectiveInstallationMethod}
            showInstallationTabs={showInstallationTabs}
            onMethodChange={handleInstallationMethodChange}
          />
        </div>
      </motion.div>
    </>
  );
}
