import { AnimatePresence, motion } from 'motion/react';
import { useTelemetry } from '../../../hooks/use-telemetry';
import { TelemetryEvent } from '../../../utils/telemetry';
import { Tabs, TabsList, TabsTrigger } from '../../primitives/tabs';
import { FrameworkCliInstructions, FrameworkInstructions } from '../framework-guides';
import type { Framework } from '../framework-guides.instructions';
import type { InstallationMethod } from './types';

const TABS_TRIGGER_CLASSES =
  'relative text-xs font-medium text-[#99A0AE] transition-all data-[state=active]:text-[#0E121B] data-[state=active]:bg-white data-[state=active]:shadow-[0px_4px_10px_rgba(14,18,27,0.06),0px_2px_4px_rgba(14,18,27,0.03)] hover:text-[#0E121B] px-1.5 py-0.5 rounded data-[state=active]:rounded-sm h-5 flex items-center justify-center min-w-fit';

type InstallationMethodSelectorProps = {
  installationMethod: InstallationMethod;
  onMethodChange: (method: InstallationMethod) => void;
};

function InstallationMethodSelector({ installationMethod, onMethodChange }: InstallationMethodSelectorProps) {
  const track = useTelemetry();

  const handleMethodChange = (value: string) => {
    track(TelemetryEvent.INBOX_IMPLEMENTATION_CLICKED, { method: value });
    onMethodChange(value as InstallationMethod);
  };

  return (
    <div className="mb-2 pl-8">
      <div className="inline-flex items-center gap-64 border border-gray-100 rounded-lg p-4">
        <span className="text-base font-medium text-[#222]">Installation method</span>
        <Tabs defaultValue="ai-assist" value={installationMethod} onValueChange={handleMethodChange}>
          <TabsList className="h-7 gap-1 rounded-md bg-[#FBFBFB] p-1 shadow-none">
            <TabsTrigger value="ai-assist" className={TABS_TRIGGER_CLASSES}>
              AI Assist
            </TabsTrigger>
            <TabsTrigger value="manual" className={TABS_TRIGGER_CLASSES}>
              Manual
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

type InstructionsPanelProps = {
  selectedFramework: Framework;
  installationMethod: InstallationMethod;
  showInstallationTabs: boolean;
  onMethodChange: (method: InstallationMethod) => void;
  footer?: React.ReactNode;
};

export function InstructionsPanel({
  selectedFramework,
  installationMethod,
  showInstallationTabs,
  onMethodChange,
  footer,
}: InstructionsPanelProps) {
  const isCliMethod = showInstallationTabs && installationMethod === 'cli';

  return (
    <div className="relative flex flex-col overflow-hidden pl-0">
      {showInstallationTabs ? (
        <InstallationMethodSelector installationMethod={installationMethod} onMethodChange={onMethodChange} />
      ) : null}

      <div className="overflow-y-auto">
        <AnimatePresence>
          <motion.div
            key={`${selectedFramework.name}-${installationMethod}-${showInstallationTabs ? 'tabs' : 'manual-only'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {isCliMethod ? (
              <FrameworkCliInstructions framework={selectedFramework} />
            ) : (
              <FrameworkInstructions framework={selectedFramework} hideCopyButton={!showInstallationTabs} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {footer && <div className="border-t border-neutral-100 bg-white py-3 pl-8">{footer}</div>}
    </div>
  );
}
