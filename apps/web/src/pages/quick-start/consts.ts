export const onBoardingSubscriberId = 'on-boarding-subscriber-id-123';
export const notificationTemplateName = 'On-boarding notification';
export const cloneDemoRepo = `git clone git@github.com:novuhq/notification-center-demo.git`;
export const APPLICATION_IDENTIFIER = '<APPLICATION_IDENTIFIER>';
export const setupProject = `npm run setup:onboarding -- ${APPLICATION_IDENTIFIER}`;
export const npmRunCommand = `npm run dev`;
export const welcomeDescription = 'Welcome to Novu, let’s get started';
export const faqUrl = 'https://docs.novu.co/notification-center/react/react-components/#faq';

interface ISnippetInstructions {
  instruction: string;
  snippet: string;
}

const installReactNotificationCenter = 'npm install @novu/notification-center';

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
  })(window, document, 'http://localhost:4701/embed.umd.min.js', 'novu', 'script');

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

export const frameworkInstructions: { key: string; value: ISnippetInstructions[] }[] = [
  {
    key: 'react',
    value: [
      { instruction: 'First you have to install the package:', snippet: installReactNotificationCenter },
      { instruction: 'Then import and render the components:', snippet: reactStarterSnippet },
    ],
  },
  {
    key: 'angular',
    value: [
      {
        instruction:
          'In the app.module.ts file import the NotificationCenterModule, and set the schemas: ' +
          '[CUSTOM_ELEMENTS_SCHEMA]:',
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
    key: 'vue',
    value: [
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
    key: 'js',
    value: [
      {
        instruction: 'Add the following script into your code.',
        snippet: embedScript,
      },
      {
        instruction: 'Add the following div that will contain the bell widget',
        snippet: embedBellSelector,
      },
    ],
  },
  {
    key: 'demo',
    value: [
      {
        instruction: 'Clone the project to your local machine',
        snippet: cloneDemoRepo,
      },
      {
        instruction: 'Run setup project command',
        snippet: setupProject,
      },
      {
        instruction: 'Run npm run dev',
        snippet: npmRunCommand,
      },
    ],
  },
];
