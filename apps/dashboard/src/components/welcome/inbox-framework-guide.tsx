import { IEnvironment } from '@novu/shared';
import { Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { fadeIn } from '@/utils/animation';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { Card, CardContent } from '../primitives/card';
import { Tabs, TabsList, TabsTrigger } from '../primitives/tabs';
import { FrameworkCliInstructions, FrameworkInstructions } from './framework-guides';
import { Framework, getFrameworks } from './framework-guides.instructions';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const TABS_TRIGGER_CLASSES =
  'relative text-xs font-medium text-[#99A0AE] transition-all data-[state=active]:text-[#0E121B] data-[state=active]:bg-white data-[state=active]:shadow-[0px_4px_10px_rgba(14,18,27,0.06),0px_2px_4px_rgba(14,18,27,0.03)] hover:text-[#0E121B] px-1.5 py-0.5 rounded data-[state=active]:rounded-sm h-5 flex items-center justify-center min-w-fit';

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

const iconVariants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.1,
    transition: {
      scale: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
  },
};

type PackageManager = 'npm' | 'pnpm' | 'yarn';

interface InboxFrameworkGuideProps {
  currentEnvironment: IEnvironment | undefined;
  subscriberId: string;
  primaryColor: string;
  foregroundColor: string;
}

function updateFrameworkCode(
  framework: Framework,
  environmentIdentifier: string,
  subscriberId: string,
  primaryColor: string,
  foregroundColor: string
): Framework {
  return {
    ...framework,
    installSteps: framework.installSteps.map((step) => ({
      ...step,
      code: step.code
        ?.replace(/YOUR_APP_ID/g, environmentIdentifier)
        ?.replace(/YOUR_APPLICATION_IDENTIFIER/g, environmentIdentifier)
        ?.replace(/YOUR_SUBSCRIBER_ID/g, subscriberId)
        ?.replace(/YOUR_PRIMARY_COLOR/g, primaryColor)
        ?.replace(/YOUR_FOREGROUND_COLOR/g, foregroundColor),
    })),
  };
}

export function InboxFrameworkGuide({
  currentEnvironment,
  subscriberId,
  primaryColor,
  foregroundColor,
}: InboxFrameworkGuideProps) {
  const track = useTelemetry();
  const [selectedFramework, setSelectedFramework] = useState<Framework>(
    getFrameworks('cli').find((f) => f.selected) || getFrameworks('cli')[0]
  );
  const [installationMethod, setInstallationMethod] = useState<'cli' | 'manual'>('cli');
  const [packageManager, setPackageManager] = useState<PackageManager>('npm');

  useEffect(() => {
    if (!currentEnvironment?.identifier || !subscriberId) return;

    const frameworks = getFrameworks(installationMethod);
    const updatedFrameworks = frameworks.map((framework) =>
      updateFrameworkCode(framework, currentEnvironment.identifier, subscriberId, primaryColor, foregroundColor)
    );

    setSelectedFramework(updatedFrameworks.find((f) => f.name === selectedFramework.name) || updatedFrameworks[0]);
  }, [
    currentEnvironment?.identifier,
    subscriberId,
    selectedFramework.name,
    primaryColor,
    foregroundColor,
    installationMethod,
  ]);

  useEffect(() => {
    if (['Remix', 'Native', 'Angular', 'JavaScript'].includes(selectedFramework.name)) {
      setInstallationMethod('manual');
    }
  }, [selectedFramework.name]);

  function handleFrameworkSelect(framework: Framework) {
    track(TelemetryEvent.INBOX_FRAMEWORK_SELECTED, {
      framework: framework.name,
    });

    setSelectedFramework(framework);
  }

  const getCliCommand = (framework: Framework) => {
    const packageName =
      framework.name.toLowerCase() === 'next.js'
        ? '@novu/nextjs'
        : framework.name.toLowerCase() === 'react'
          ? '@novu/react'
          : '@novu/js';

    const command = `add inbox --appId ${currentEnvironment?.identifier} --subscriberId ${subscriberId}`;

    switch (packageManager) {
      case 'pnpm':
        return `pnpm dlx novu ${command}`;
      case 'yarn':
        return `yarn dlx novu ${command}`;
      case 'npm':
      default:
        return `npx novu ${command}`;
    }
  };

  const frameworks = getFrameworks(installationMethod);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex items-start gap-4 pl-[72px]"
      >
        <div className="flex flex-col border-l border-[#eeeef0] p-8">
          <div className="flex items-center gap-2">
            <Loader className="h-3.5 w-3.5 text-[#dd2476] [animation:spin_5s_linear_infinite]" />
            <span className="animate-gradient bg-gradient-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-[length:400%_400%] bg-clip-text text-sm font-medium text-transparent">
              Watching for Inbox Integration
            </span>
          </div>
          <p className="text-foreground-400 text-xs">You're just a couple steps away from your first notification.</p>
        </div>
      </motion.div>

      {/* Framework Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 px-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {frameworks.map((framework) => (
              <motion.div
                key={framework.name}
                variants={cardVariants}
                initial="initial"
                whileHover="hover"
                animate={framework.name === selectedFramework.name ? 'hover' : 'initial'}
                className="relative"
              >
                <Card
                  onClick={() => handleFrameworkSelect(framework)}
                  className={`flex h-[100px] w-[100px] flex-col items-center justify-center border-none p-6 shadow-none hover:cursor-pointer ${
                    framework.name === selectedFramework.name ? 'bg-neutral-100' : ''
                  }`}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-0">
                    <motion.div variants={iconVariants} className="relative text-2xl">
                      {framework.icon}
                    </motion.div>
                    <span className="text-sm text-[#525866]">{framework.name}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Code block area with subtle installation method selector above */}
        {['Next.js', 'React'].includes(selectedFramework.name) ? (
          <div className="flex flex-col gap-3">
            {/* Header row: label left, tabs right */}
            <div className="mb-2 flex items-center gap-64 pl-8">
              <span className="text-base font-medium text-[#222]">Installation method</span>
              <Tabs
                defaultValue="cli"
                value={installationMethod}
                onValueChange={(value) => setInstallationMethod(value as 'cli' | 'manual')}
              >
                <TabsList className="ml-4 h-7 w-[159px] gap-1 rounded-md bg-[#FBFBFB] p-1 shadow-none">
                  <TabsTrigger value="cli" className={TABS_TRIGGER_CLASSES}>
                    CLI Installation
                  </TabsTrigger>
                  <TabsTrigger value="manual" className={TABS_TRIGGER_CLASSES}>
                    Manual
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="relative overflow-hidden pl-0">
              <AnimatePresence mode="wait">
                <motion.div key={installationMethod} {...fadeIn} className="w-full">
                  {installationMethod === 'cli' ? (
                    <FrameworkCliInstructions framework={selectedFramework as Framework} />
                  ) : (
                    <FrameworkInstructions framework={selectedFramework as Framework} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="relative mt-2 overflow-hidden pl-0">
            <motion.div key="manual" {...fadeIn} className="w-full">
              <FrameworkInstructions framework={selectedFramework as Framework} />
            </motion.div>
          </div>
        )}
      </motion.div>
    </>
  );
}
