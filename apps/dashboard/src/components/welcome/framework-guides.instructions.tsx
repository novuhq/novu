import { RiAngularjsFill, RiJavascriptFill, RiNextjsFill, RiReactjsFill, RiRemixRunFill } from 'react-icons/ri';
import { Language } from '../primitives/code-block';
import { API_HOSTNAME, WEBSOCKET_HOSTNAME } from '@/config';

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
}

const isDefaultApi = API_HOSTNAME === 'https://api.novu.co';
const isDefaultWs = WEBSOCKET_HOSTNAME === 'https://ws.novu.co';

export const customizationTip = {
  title: 'Tip:',
  description: (
    <>
      You can customize your inbox to match your app theme,{' '}
      <a href="https://docs.novu.co/inbox/react/styling#appearance-prop" target="_blank" className="underline">
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

export const frameworks: Framework[] = [
  {
    name: 'Next.js',
    icon: <RiNextjsFill className="h-8 w-8 text-black" />,
    selected: true,
    installSteps: [
      commonInstallStep('@novu/nextjs'),
      {
        title: 'Add the inbox code to your Next.js app',
        description: 'Inbox utilizes the Next.js router to enable navigation within your notifications.',
        code: `import { Inbox } from '@novu/nextjs';

function Novu() {
  return (
    <Inbox
      applicationIdentifier="YOUR_APPLICATION_IDENTIFIER"
      subscriberId="YOUR_SUBSCRIBER_ID"${!isDefaultApi ? `\n      ${`backendUrl="${API_HOSTNAME}"`}` : ''}${!isDefaultWs ? `\n      ${`socketUrl="${WEBSOCKET_HOSTNAME}"`}` : ''}
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
  },
  {
    name: 'React',
    icon: <RiReactjsFill className="h-8 w-8 text-[#61DAFB]" />,
    installSteps: [
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
      subscriberId="YOUR_SUBSCRIBER_ID"${!isDefaultApi ? `\n      ${`backendUrl="${API_HOSTNAME}"`}` : ''}${!isDefaultWs ? `\n      ${`socketUrl="${WEBSOCKET_HOSTNAME}"`}` : ''}
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
  },
  {
    name: 'Remix',
    icon: <RiRemixRunFill className="h-8 w-8 text-black" />,
    installSteps: [
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
      subscriberId="YOUR_SUBSCRIBER_ID"${!isDefaultApi ? `\n      ${`backendUrl="${API_HOSTNAME}"`}` : ''}${!isDefaultWs ? `\n      ${`socketUrl="${WEBSOCKET_HOSTNAME}"`}` : ''}
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
  },
  {
    name: 'Native',
    icon: <RiReactjsFill className="h-8 w-8 text-black" />,
    installSteps: [
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
      subscriberId="YOUR_SUBSCRIBER_ID"${!isDefaultApi ? `\n      ${`backendUrl="${API_HOSTNAME}"`}` : ''}${!isDefaultWs ? `\n      ${`socketUrl="${WEBSOCKET_HOSTNAME}"`}` : ''}
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
  },
  {
    name: 'Angular',
    icon: <RiAngularjsFill className="h-8 w-8 text-[#DD0031]" />,
    installSteps: [
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
        applicationIdentifier: '123',
        subscriberId: '456',
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
        tip: customizationTip,
      },
    ],
  },
  {
    name: 'JavaScript',
    icon: <RiJavascriptFill className="h-8 w-8 text-[#F7DF1E]" />,
    installSteps: [
      commonInstallStep('@novu/js'),
      {
        title: 'Add the inbox code to your JavaScript app',
        description:
          'You can use the Novu UI library to implement the notification center in your vanilla JavaScript application or any other non-supported framework like Vue.',
        code: `import { NovuUI } from '@novu/js/ui';

 const novu = new NovuUI({
  options: {
    applicationIdentifier: '123',
    subscriberId: '456',
  },
});

novu.mountComponent({
  name: 'Inbox',
  props: {},
  element: document.getElementById('notification-inbox'),
});`,
        codeLanguage: 'typescript',
        tip: customizationTip,
      },
    ],
  },
];
