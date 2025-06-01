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

export const customizationTip = {
  title: 'Tip:',
  description: (
    <>
      You can customize your inbox to match your app theme,{' '}
      <a href="https://docs.novu.co/platform/inbox/react/styling#appearance-prop" target="_blank" className="underline">
        learn more
      </a>
      .
    </>
  ),
};

export const commonInstallStep = (packageName: string): InstallationStep => ({
  title: 'Run the CLI command in an existing project',
  description: `You'll notice a new folder in your project called inbox. This is where you'll find the inbox component boilerplate code. \n You can customize the <Inbox /> component to match your app theme.`,
  code: `npx novu@add-inbox --appId YOUR_APPLICATION_IDENTIFIER --subscriberId YOUR_SUBSCRIBER_ID`,
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
      // {
      //   title: 'Add the inbox code to your Next.js app',
      //   description: 'Inbox utilizes the Next.js router to enable navigation within your notifications.',
      //   // code: `import { Inbox } from '@novu/nextjs'`,
      //   codeLanguage: 'tsx',
      //   codeTitle: 'Inbox.tsx',
      //   tip: customizationTip,
      // },
    ],
  },
  {
    name: 'React',
    icon: <RiReactjsFill className="h-8 w-8 text-[#61DAFB]" />,
    installSteps: [
      commonInstallStep('@novu/react'),
      // {
      //   title: 'Add the inbox code to your React app',
      //   description:
      //     'Inbox utilizes the routerPush prop and your preferred router to enable navigation within your notifications.',
      //   code: `import { Inbox } from '@novu/react'`,
      //   codeLanguage: 'tsx',
      //   codeTitle: 'Inbox.tsx',
      //   tip: customizationTip,
      // },
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
        code: `import { Inbox } from '@novu/react'`,
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
        code: `import { NovuProvider } from '@novu/react-native'`,
        codeLanguage: 'tsx',
        codeTitle: 'App.tsx',
      },
      {
        title: 'Build your custom inbox component',
        description: 'Build your custom inbox component to use within your app.',
        code: `import { Inbox } from '@novu/react-native'`,
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
        code: `import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core'`,
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
        code: `import { NovuUI } from '@novu/js/ui';`,
        codeLanguage: 'typescript',
        tip: customizationTip,
      },
    ],
  },
];
