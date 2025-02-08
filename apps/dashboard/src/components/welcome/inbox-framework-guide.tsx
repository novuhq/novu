import { Loader } from 'lucide-react';
import { Card, CardContent } from '../primitives/card';
import { useState, useEffect } from 'react';
import { IEnvironment } from '@novu/shared';
import { API_HOSTNAME, WEBSOCKET_HOSTNAME } from '../../config';
import { motion } from 'motion/react';
import { Framework, frameworks } from './framework-guides.instructions';
import { FrameworkInstructions } from './framework-guides';
import { TelemetryEvent } from '../../utils/telemetry';
import { useTelemetry } from '../../hooks/use-telemetry';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

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

interface InboxFrameworkGuideProps {
  currentEnvironment: IEnvironment | undefined;
  subscriberId: string;
  primaryColor: string;
  foregroundColor: string;
}

function getUrlProps(isDefaultApi: boolean, isDefaultWs: boolean): string {
  const props = [
    ...(isDefaultApi ? [] : [`backendUrl="${API_HOSTNAME}"`]),
    ...(isDefaultWs ? [] : [`socketUrl="${WEBSOCKET_HOSTNAME}"`]),
  ];

  return props.length ? '\n      ' + props.join('\n      ') : '';
}

function generateInboxComponent(
  environmentIdentifier: string,
  subscriberId: string,
  urlProps: string,
  primaryColor: string,
  foregroundColor: string
): string {
  return `<Inbox
      applicationIdentifier="${environmentIdentifier}"
      subscriberId="${subscriberId}"
      routerPush={(path: string) => router.push(path)}${urlProps}
      appearance={{
        variables: {
          colorPrimary: "${primaryColor}",
          colorForeground: "${foregroundColor}"
        }
      }}
    />`;
}

function generateNovuProvider(environmentIdentifier: string, subscriberId: string, urlProps: string): string {
  return `<NovuProvider
      applicationIdentifier="${environmentIdentifier}"
      subscriberId="${subscriberId}"${urlProps}
    >
      <YourCustomInbox />
    </NovuProvider>`;
}

function updateFrameworkCode(
  framework: Framework,
  inboxComponent: string,
  novuProvider: string,
  environmentIdentifier: string,
  subscriberId: string
): Framework {
  return {
    ...framework,
    installSteps: framework.installSteps.map((step) => ({
      ...step,
      code: step.code
        ?.replace(/<Inbox[\s\S]*?\/>/, inboxComponent)
        ?.replace(/<NovuProvider[\s\S]*?<\/NovuProvider>/, novuProvider)
        ?.replace(/YOUR_APP_ID/g, environmentIdentifier)
        ?.replace(/YOUR_APPLICATION_IDENTIFIER/g, environmentIdentifier)
        ?.replace(/YOUR_SUBSCRIBER_ID/g, subscriberId),
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
  const [selectedFramework, setSelectedFramework] = useState(frameworks.find((f) => f.selected) || frameworks[0]);

  useEffect(() => {
    if (!currentEnvironment?.identifier || !subscriberId) return;

    const isDefaultApi = API_HOSTNAME === 'https://api.novu.co';
    const isDefaultWs = WEBSOCKET_HOSTNAME === 'https://ws.novu.co';

    const urlProps = getUrlProps(isDefaultApi, isDefaultWs);
    const inboxComponent = generateInboxComponent(
      currentEnvironment.identifier,
      subscriberId,
      urlProps,
      primaryColor,
      foregroundColor
    );
    const novuProvider = generateNovuProvider(currentEnvironment.identifier, subscriberId, urlProps);

    const updatedFrameworks = frameworks.map((framework) =>
      updateFrameworkCode(framework, inboxComponent, novuProvider, currentEnvironment.identifier, subscriberId)
    );

    setSelectedFramework(updatedFrameworks.find((f) => f.name === selectedFramework.name) || updatedFrameworks[0]);
  }, [currentEnvironment?.identifier, subscriberId, selectedFramework.name, primaryColor, foregroundColor]);

  function handleFrameworkSelect(framework: Framework) {
    track(TelemetryEvent.INBOX_FRAMEWORK_SELECTED, {
      framework: framework.name,
    });

    setSelectedFramework(framework);
  }

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
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex gap-2 px-6">
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
      </motion.div>

      <div className="min-h-[600px] w-full">
        <FrameworkInstructions framework={selectedFramework} />
      </div>
    </>
  );
}
