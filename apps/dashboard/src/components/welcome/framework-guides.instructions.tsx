import { API_HOSTNAME, IS_EU } from '@/config';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { RiAngularjsFill, RiJavascriptFill, RiNextjsFill, RiReactjsFill, RiRemixRunFill } from 'react-icons/ri';
import { Language } from '../primitives/code-block';
import { getFrameworkPrompt } from './ai-prompts/simple-prompt-getter';

export interface Framework {
  name: string;
  icon: JSX.Element;
  selected?: boolean;
  installSteps: InstallationStep[];
}

export interface InstallationStep {
  title: string;
  description: string;
  code?: string;
  codeLanguage: Language;
  codeTitle?: string;
  tip?: {
    title?: string;
    description: string | React.ReactNode;
  };
  buttonText?: string;
  buttonAction?: () => void;
  copyText?: string;
}

const isDefaultApi = API_HOSTNAME === 'https://api.novu.co';
const currentWebSocketHostname = apiHostnameManager.getWebSocketHostname();
const isDefaultWs = currentWebSocketHostname === 'https://ws.novu.co';

// Convert https:// to wss:// for WebSocket URLs
const getWebSocketUrl = (url: string) => {
  if (!url) return url;
  return url.replace(/^https:\/\//, 'wss://');
};

const websocketUrl = getWebSocketUrl(currentWebSocketHostname);

// Shared helpers to minimize duplication
const cliFlags = `${isDefaultApi && IS_EU ? ' --region=eu' : ''}${!isDefaultApi ? ` --backendUrl ${API_HOSTNAME}` : ''}${!isDefaultWs ? ` --socketUrl ${currentWebSocketHostname}` : ''}`;

function optionalAttrProps(indent: string): string {
  return `${!isDefaultApi ? `\n${indent}${`backendUrl="${API_HOSTNAME}"`}` : ''}${!isDefaultWs ? `\n${indent}${`socketUrl="${websocketUrl}"`}` : ''}`;
}

function optionalObjectProps(indent: string): string {
  return `${!isDefaultApi ? `\n${indent}${`backendUrl: '${API_HOSTNAME}',`}` : ''}${!isDefaultWs ? `\n${indent}${`socketUrl: '${websocketUrl}',`}` : ''}`;
}

function stepsByMethod(
  installationMethod: 'cli' | 'manual' | 'ai-assist',
  manualSteps: InstallationStep[],
  frameworkName?: string,
  applicationIdentifier?: string,
  subscriberId?: string
): InstallationStep[] {
  if (installationMethod === 'cli') return [commonCLIInstallStep()];
  if (installationMethod === 'ai-assist') {
    return [
      commonAIAssistInstallStep(
        frameworkName || '',
        applicationIdentifier || 'YOUR_APPLICATION_IDENTIFIER',
        subscriberId || 'YOUR_SUBSCRIBER_ID'
      ),
    ];
  }
  return manualSteps;
}

export const customizationTip = {
  title: 'Tip:',
  description: (
    <>
      You can customize your inbox to match your app theme,{' '}
      <a
        href="https://docs.novu.co/platform/inbox/configuration/styling"
        target="_blank"
        className="underline"
        rel="noopener"
      >
        learn more
      </a>
      .
    </>
  ),
};

export const commonInstallStep = (packageName: string): InstallationStep => ({
  title: 'Install the package',
  description: `${packageName} is the package that powers the notification center.`,
  code: `npm install ${packageName}`,
  codeLanguage: 'shell',
  codeTitle: 'Terminal',
});

export const commonCLIInstallStep = (): InstallationStep => ({
  title: 'Run the CLI command in an existing project',
  description: `You'll notice a new folder in your project called inbox. This is where you'll find the inbox component boilerplate code. \n You can customize the <Inbox /> component to match your app theme.`,
  code: `npx add-inbox@latest --appId YOUR_APPLICATION_IDENTIFIER --subscriberId YOUR_SUBSCRIBER_ID${cliFlags}`,
  codeLanguage: 'shell',
  codeTitle: 'Terminal',
});

export const commonAIAssistInstallStep = (
  frameworkName: string,
  applicationIdentifier: string,
  subscriberId: string
): InstallationStep => ({
  title: 'Let your AI do the setup',
  description: `Copy this quick-start guide as a prompt for LLMs inside your IDE to implement Novu in your application.`,
  buttonText: 'Copy AI prompt',
  copyText: getFrameworkPrompt(frameworkName, applicationIdentifier, IS_EU ? 'eu' : 'us', subscriberId),
  codeLanguage: 'shell',
});

export const getFrameworks = (
  installationMethod: 'cli' | 'manual' | 'ai-assist',
  applicationIdentifier?: string,
  subscriberId?: string
): Framework[] => [
  {
    name: 'Next.js',
    icon: <RiNextjsFill className="h-8 w-8 text-black" />,
    selected: true,
    installSteps: stepsByMethod(
      installationMethod,
      [
        commonInstallStep('@novu/nextjs'),
        {
          title: 'Add the inbox code to your Next.js app',
          description: 'Inbox utilizes the Next.js router to enable navigation within your notifications.',
          code: `import { Inbox } from '@novu/nextjs';

function Novu() {
  return (
    <Inbox
      applicationIdentifier="YOUR_APPLICATION_IDENTIFIER"
      subscriberId="YOUR_SUBSCRIBER_ID"${optionalAttrProps('      ')}
      appearance={{
        variables: {
          colorPrimary: "YOUR_PRIMARY_COLOR",
          colorForeground: "YOUR_FOREGROUND_COLOR"
        }
      }}
    />
  );
}`,
          codeLanguage: 'tsx',
          codeTitle: 'Inbox.tsx',
          tip: customizationTip,
        },
      ],
      'Next.js',
      applicationIdentifier,
      subscriberId
    ),
  },
  {
    name: 'React',
    icon: <RiReactjsFill className="h-8 w-8 text-[#61DAFB]" />,
    installSteps: stepsByMethod(
      installationMethod,
      [
        commonInstallStep('@novu/react'),
        {
          title: 'Add the inbox code to your React app',
          description:
            'Inbox utilizes the routerPush prop and your preferred router to enable navigation within your notifications.',
          code: `import { Inbox } from '@novu/react';
import { useNavigate } from 'react-router-dom';

function Novu() {
  const navigate = useNavigate();

  return (
    <Inbox
      applicationIdentifier="YOUR_APPLICATION_IDENTIFIER"
      subscriberId="YOUR_SUBSCRIBER_ID"${optionalAttrProps('      ')}
      routerPush={(path: string) => navigate(path)}
      appearance={{
        variables: {
          colorPrimary: "YOUR_PRIMARY_COLOR",
          colorForeground: "YOUR_FOREGROUND_COLOR"
        }
      }}
    />
  );
}`,
          codeLanguage: 'tsx',
          codeTitle: 'Inbox.tsx',
          tip: customizationTip,
        },
      ],
      'React',
      applicationIdentifier,
      subscriberId
    ),
  },
  {
    name: 'Remix',
    icon: <RiRemixRunFill className="h-8 w-8 text-black" />,
    installSteps: stepsByMethod(
      installationMethod,
      [
        commonInstallStep('@novu/react'),
        {
          title: 'Add the inbox code to your Remix app',
          description: 'Inbox utilizes the routerPush prop to enable navigation within your notifications.',
          code: `import { Inbox } from '@novu/react';
import { useNavigate } from '@remix-run/react';

function Novu() {
  const navigate = useNavigate();

  return (
    <Inbox
      applicationIdentifier="YOUR_APPLICATION_IDENTIFIER"
      subscriberId="YOUR_SUBSCRIBER_ID"${optionalAttrProps('      ')}
      routerPush={(path: string) => navigate(path)}
      appearance={{
        variables: {
          colorPrimary: "YOUR_PRIMARY_COLOR",
          colorForeground: "YOUR_FOREGROUND_COLOR"
        }
      }}
    />
  );
}`,
          codeLanguage: 'tsx',
          codeTitle: 'Inbox.tsx',
          tip: customizationTip,
        },
      ],
      'Remix',
      applicationIdentifier,
      subscriberId
    ),
  },
  {
    name: 'Native',
    icon: <RiReactjsFill className="h-8 w-8 text-black" />,
    installSteps: stepsByMethod(
      installationMethod,
      [
        commonInstallStep('@novu/react-native'),
        {
          title: 'Add the inbox code to your React Native app',
          description: 'Implement the notification center in your React Native application.',
          code: `import { NovuProvider } from '@novu/react-native';
import { YourCustomInbox } from './Inbox';

function Layout() {
  return (
     <NovuProvider
      applicationIdentifier="YOUR_APPLICATION_IDENTIFIER"
      subscriberId="YOUR_SUBSCRIBER_ID"${optionalAttrProps('      ')}
    >
      <YourCustomInbox />
    </NovuProvider>
  );
}`,
          codeLanguage: 'tsx',
          codeTitle: 'App.tsx',
        },
        {
          title: 'Build your custom inbox component',
          description: 'Build your custom inbox component to use within your app.',
          code: `import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNotifications, Notification } from "@novu/react-native";

export function YourCustomInbox() {
   const { notifications, isLoading, fetchMore, hasMore, refetch } = useNotifications();

  const renderItem = ({ item }) => (  
    <View>
      <Text>{item.body}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View>
      <Text>No updates available</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      onEndReached={fetchMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          colors={["#2196F3"]}
        />
      }
    />
  );
}`,
          codeLanguage: 'tsx',
          codeTitle: 'Inbox.tsx',
        },
      ],
      'Native',
      applicationIdentifier,
      subscriberId
    ),
  },
  {
    name: 'Angular',
    icon: <RiAngularjsFill className="h-8 w-8 text-[#DD0031]" />,
    installSteps: stepsByMethod(
      installationMethod,
      [
        commonInstallStep('@novu/js'),
        {
          title: 'Add the inbox code to your Angular app',
          description: 'Currently, angular applications are supported with the Novu UI library.',
          code: `import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NovuUI } from '@novu/js/ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('notificationInbox') notificationInbox!: ElementRef<HTMLElement>;
  title = 'inbox-angular';

  ngAfterViewInit() {
    const novu = new NovuUI({
      options: {
        applicationIdentifier: 'YOUR_APPLICATION_IDENTIFIER',
        subscriber: 'YOUR_SUBSCRIBER_ID',${optionalObjectProps('        ')}
      },
    });

    novu.mountComponent({
      name: 'Inbox',
      props: {},
      element: this.notificationInbox.nativeElement,
    });
  }
}`,
          codeLanguage: 'typescript',
          codeTitle: 'app.component.ts',
          tip: customizationTip,
        },
      ],
      'Angular',
      applicationIdentifier,
      subscriberId
    ),
  },
  {
    name: 'JavaScript',
    icon: <RiJavascriptFill className="h-8 w-8 text-[#F7DF1E]" />,
    installSteps: stepsByMethod(
      installationMethod,
      [
        commonInstallStep('@novu/js'),
        {
          title: 'Add the inbox code to your JavaScript app',
          description:
            'You can use the Novu UI library to implement the notification center in your vanilla JavaScript application or any other non-supported framework like Vue.',
          code: `import { NovuUI } from '@novu/js/ui';

    const novu = new NovuUI({
    options: {
      applicationIdentifier: 'YOUR_APPLICATION_IDENTIFIER',
      subscriber: 'YOUR_SUBSCRIBER_ID',${optionalObjectProps('    ')}
    },
  });

novu.mountComponent({
  name: 'Inbox',
  props: {},
  element: document.getElementById('notification-inbox'),
});`,
          codeLanguage: 'typescript',
          codeTitle: 'app.js',
          tip: customizationTip,
        },
      ],
      'JavaScript',
      applicationIdentifier,
      subscriberId
    ),
  },
];

// Export a default frameworks array for backward compatibility
export const frameworks = getFrameworks('manual');
