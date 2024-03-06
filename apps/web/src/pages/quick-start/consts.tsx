import React, { Dispatch } from 'react';
import { Stack } from '@mantine/core';
import { NavigateFunction } from 'react-router-dom';
import { ChannelTypeEnum, UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import { Bell, Chat, Mail, Mobile, Sms } from '@novu/design-system';

import { ROUTES } from '../../constants/routes.enum';
import { WIDGET_EMBED_PATH } from '../../config';

export const onBoardingSubscriberId = 'on-boarding-subscriber-id-123';
export const inAppSandboxSubscriberId = 'in-app-sandbox-subscriber-id-123';
export const notificationTemplateName = 'On-boarding notification';
export const cloneDemoRepo = 'git clone https://github.com/novuhq/notification-center-demo.git';
export const APPLICATION_IDENTIFIER = '<APPLICATION_IDENTIFIER>';
export const API_KEY = '<API_KEY>';
export const BACKEND_API_URL = '<BACKEND_API_URL>';
export const BACKEND_SOCKET_URL = '<BACKEND_SOCKET_URL>';
// eslint-disable-next-line max-len
export const setupProject = `cd notification-center-demo && npm run setup:onboarding -- ${APPLICATION_IDENTIFIER} ${API_KEY} ${BACKEND_API_URL} ${BACKEND_SOCKET_URL}`;
export const npmRunCommand = 'npm run dev';
export const frameworkSetupTitle = 'Choose your go-to framework';
export const faqUrl = `https://docs.novu.co/notification-center/introduction${UTM_CAMPAIGN_QUERY_PARAM}`;
export const notificationCenterDocsUrl = `https://docs.novu.co/notification-center/introduction${UTM_CAMPAIGN_QUERY_PARAM}`;
export const discordInviteUrl = 'https://discord.gg/novu';
export const demoSetupSecondaryTitle = 'Follow the installation steps to connect your app';

export const getStartedSteps = { first: ROUTES.GET_STARTED, second: ROUTES.GET_STARTED_PREVIEW };

interface ISnippetInstructions {
  instruction: React.ReactNode | string;
  snippet: string;
  language?: string;
}

const installReactNotificationCenter = 'npm install @novu/notification-center';
const installAngularNotificationCenter = 'npm install @novu/notification-center-angular';
const installVueNotificationCenter = 'npm install @novu/notification-center-vue';

export const reactStarterSnippet = `import React from 'react';
import {
  NovuProvider,
  PopoverNotificationCenter,
  NotificationBell,
} from '@novu/notification-center';

export const Header = () => {
  return (
    <NovuProvider subscriberId={'${onBoardingSubscriberId}'} applicationIdentifier={'${APPLICATION_IDENTIFIER}'}>
      <PopoverNotificationCenter colorScheme={'light'}>
        {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
};`;

const angularInteractions = (
  <div>
    <Stack spacing={1}>
      <span>In the app.module.ts file import the NotificationCenterModule, and set the schemas:</span>
      <span>[CUSTOM_ELEMENTS_SCHEMA]</span>
    </Stack>
  </div>
);

export const angularAppSnippet = `import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

import { NotificationCenterModule } from '@novu/notification-center-angular';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, NotificationCenterModule],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}`;

export const angularComponentSnippet = `import { Component } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
})
export class AppComponent {
  subscriberId = '${onBoardingSubscriberId}';
  applicationIdentifier = '${APPLICATION_IDENTIFIER}';

  sessionLoaded = (data: unknown) => {
    console.log('loaded', { data });
  };
}`;

export const angularHtmlSnippet = `<notification-center-component
    [subscriberId]="subscriberId"
    [applicationIdentifier]="applicationIdentifier"
    [sessionLoaded]="sessionLoaded"
  ></notification-center-component>`;

const vuePluginSnippet = `import NotificationCenterPlugin from '@novu/notification-center-vue';
import '@novu/notification-center-vue/dist/style.css';

import App from './App.vue';

createApp(App).use(NotificationCenterPlugin).mount('#app');`;

export const vueComponentSnippet = `<script lang="ts">
export default {
  data() {
    return {
      applicationIdentifier: '${APPLICATION_IDENTIFIER}',
      subscriberId: '${onBoardingSubscriberId}',
    };
  },
  methods: {
    sessionLoaded() {
      console.log('Session loaded!');
    },
  },
};
</script>

<template>
  <NotificationCenterComponent
    :subscriberId="subscriberId"
    :applicationIdentifier="applicationIdentifier"
    :sessionLoaded="sessionLoaded"
    v-slot="slot"
  >
    <button>Notifications: {{ slot.unseenCount }}</button>
  </NotificationCenterComponent>
</template>

<style scoped></style>`;

const embedScript = `<script>
  (function(n,o,t,i,f) {
    n[i] = {}; var m = ['init', 'on']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, '${WIDGET_EMBED_PATH}', 'novu', 'script');

  novu.init('${APPLICATION_IDENTIFIER}', '#notification-bell', {
    subscriberId: "${onBoardingSubscriberId}",
  });
</script>`;

const embedBellSelector = `<nav>
  <div id="notification-bell">
    <i class="fa fa-bell"></i>
    <span id="unseen-badge"></span>
  </div>
</nav>`;

export enum FrameworkEnum {
  REACT = 'react',
  ANGULAR = 'angular',
  VUE = 'vue',
  JS = 'js',
  DEMO = 'demo',
}

export const frameworkInstructions: { key: string; value: ISnippetInstructions[] }[] = [
  {
    key: FrameworkEnum.REACT,
    value: [
      {
        instruction: 'First you have to install the package:',
        snippet: installReactNotificationCenter,
        language: 'bash',
      },
      { instruction: 'Then import and render the components:', snippet: reactStarterSnippet },
    ],
  },
  {
    key: FrameworkEnum.ANGULAR,
    value: [
      {
        instruction: 'First you have to install the package:',
        snippet: installAngularNotificationCenter,
        language: 'bash',
      },
      {
        instruction: angularInteractions,
        snippet: angularAppSnippet,
      },
      {
        instruction: 'In the component define variables for the notification-center-component',
        snippet: angularComponentSnippet,
      },
      {
        instruction: 'Use the notification-center-component in the HTML template file',
        snippet: angularHtmlSnippet,
      },
    ],
  },
  {
    key: FrameworkEnum.VUE,
    value: [
      {
        instruction: 'First you have to install the package:',
        snippet: installVueNotificationCenter,
        language: 'bash',
      },
      {
        instruction: 'In the main.ts file import the plugin and styles and then use that plugin.',
        snippet: vuePluginSnippet,
      },
      {
        instruction: 'Now NotificationCenterComponent could be used like this in the Vue component file:',
        snippet: vueComponentSnippet,
      },
    ],
  },
  {
    key: FrameworkEnum.JS,
    value: [
      {
        instruction: 'Add the following script into your code.',
        snippet: embedScript,
        language: 'html',
      },
      {
        instruction: 'Add the following div that will contain the bell widget',
        snippet: embedBellSelector,
        language: 'html',
      },
    ],
  },
  {
    key: FrameworkEnum.DEMO,
    value: [
      {
        instruction: 'Clone the project to your local machine',
        snippet: cloneDemoRepo,
        language: 'bash',
      },
      {
        instruction: 'Run setup project command',
        snippet: setupProject,
        language: 'bash',
      },
      {
        instruction: 'Run npm run dev',
        snippet: npmRunCommand,
        language: 'bash',
      },
    ],
  },
];

export enum OnBoardingAnalyticsEnum {
  FRAMEWORK_SETUP_VISIT = 'In app frameworks select',
  FRAMEWORKS_SETUP_VISIT = 'Framework Setup Page Visit',
  FLOW_SELECTED = 'Quick Start Flow Select',
  TRIGGER_VISIT = 'Trigger Page Visit',
  CLICKED_FAQ = 'Clicked On FAQ',
  CLICKED_DOCS = 'Clicked On Our Docs',
  CLICKED_HELP_REQUEST = 'Clicked On Help Request',
  CLICKED_ASK_COMMUNITY = 'Clicked On Ask Community',
  CLICKED_CREATE_TEMPLATE = 'Clicked On Create Template',
  CLICKED_TRIGGER_EVENT = 'Clicked On Trigger Event',
  COPIED_STEP = 'Copied Snippet',
  CONFIGURE_PROVIDER_VISIT = 'Page Visit - [Get Started - Configure Provider]',
  CONFIGURE_PROVIDER_LEARN_MORE_CLICK = 'Learn More Click - [Get Started - Configure Provider]',
  CONFIGURE_PROVIDER_CLICK = 'Configure Provider Click - [Get Started - Configure Provider]',
  UPDATE_PROVIDER_CLICK = 'Update Provider Click - [Get Started - Configure Provider]',
  CONFIGURE_PROVIDER_NAVIGATION_NEXT_PAGE_CLICK = 'Next Page Click - [Get Started - Configure Provider]',
  NAVIGATION_CONFIGURE_PROVIDER_CLICK = 'Navigation Configure Provider Click - [Get Started]',
  NAVIGATION_BUILD_WORKFLOW_CLICK = 'Navigation Build Workflow Click - [Get Started]',
  BUILD_WORKFLOW_VISIT = 'Page Visit - [Get Started - Build WorkFlow]',
  BUILD_WORKFLOW_PREVIOUS_PAGE_CLICK = 'Previous Page Click - [Get Started - Build WorkFlow]',
  BUILD_WORKFLOW_CLICK = 'Build Workflow Click - [Get Started - Build WorkFlow]',
  BUILD_WORKFLOW_TRY_DIGEST_PLAYGROUND_CLICK = 'Try Digest Playground Click - [Get Started - Build WorkFlow]',
  BUILD_WORKFLOW_NODE_POPOVER_LEARN_MORE_CLICK = 'Node Popover Learn More Click - [Get Started - Build WorkFlow]',
  IN_APP_SANDBOX_SUCCESS_VISIT = 'Success Page Visit - [In-App Sandbox - Success]',
  IN_APP_SANDBOX_RUN_TRIGGER_CLICK = 'Run Trigger Clicked - [In-App Sandbox]',
  CONFIGURE_LATER_CLICK = 'Configure Later Click',

  // Onboarding Experiment
  ONBOARDING_EXPERIMENT_TEST_NOTIFICATION = 'Button Clicked - [Onboarding]',
}

export enum FlowTypeEnum {
  IN_APP = 'in_app',
  OTHER = 'other',
}

export const quickStartChannels: IQuickStartChannelConfiguration[] = [
  {
    Icon: Mail,
    title: 'Email',
    displayName: 'Email',
    type: ChannelTypeEnum.EMAIL,
    description: '🎉  Try our gift: 300 emails Use Novu provider for free or change the provider to yours',
    clickHandler: (options) => {
      options.setClickedChannel({ open: true, channelType: options.channelType });
    },
  },
  {
    Icon: Bell,
    title: 'In-App notifications',
    displayName: 'In-App',
    type: ChannelTypeEnum.IN_APP,
    description: 'A set of APIs and components to create a customized notification center',
    clickHandler: (options) => {
      options.navigate(ROUTES.QUICK_START_NOTIFICATION_CENTER);
    },
  },
  {
    Icon: Mobile,
    title: 'Push',
    displayName: 'Push',
    type: ChannelTypeEnum.PUSH,
    description: 'Set up an integration with FCM, APNS or any other mobile push provider',
    clickHandler: (options) => {
      options.setClickedChannel({ open: true, channelType: options.channelType });
    },
  },
  {
    Icon: Chat,
    title: 'Chat',
    displayName: 'Chat',
    type: ChannelTypeEnum.CHAT,
    description: 'Connect chat apps such as Slack, Discord and Teams.',
    clickHandler: (container) => {
      container.setClickedChannel({ open: true, channelType: container.channelType });
    },
  },
  {
    Icon: Sms,
    title: 'SMS',
    displayName: 'SMS',
    type: ChannelTypeEnum.SMS,
    description: 'Connect to a SMS provider to start sending SMS programmatically',
    clickHandler: (options) => {
      options.setClickedChannel({ open: true, channelType: options.channelType });
    },
  },
];

export interface IQuickStartChannelConfiguration {
  Icon: React.FC<any>;
  title: string;
  displayName: string;
  type: ChannelTypeEnum;
  description: string;
  clickHandler: (options: IOptions) => void;
}

interface IOptions {
  navigate: NavigateFunction;
  setClickedChannel: Dispatch<any>;
  channelType: ChannelTypeEnum;
}
