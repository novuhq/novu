import { App, provide, ref } from 'vue';

import { Novu } from '@novu/js';

import Inbox from './components/Inbox.vue';
import InboxContent from './components/InboxContent.vue';
import Notifications from './components/Notifications.vue';
import Preferences from './components/Preferences.vue';
import Bell from './components/Bell.vue';
import NovuProvider from './components/NovuProvider.vue';
import { NovuKey, NovuProviderProps } from './components';

export * from './components';
export * from './hooks';
export * from './context/NovuProviderContext';

// @ts-ignore
const version = PACKAGE_VERSION;
// @ts-ignore
const name = PACKAGE_NAME;
const baseUserAgent = `${name}@${version}`;

// Optional: Global install function
export default {
  install(app: App, options?: NovuProviderProps) {
    app.component('Inbox', Inbox);
    app.component('InboxContent', InboxContent);
    app.component('Notifications', Notifications);
    app.component('Preferences', Preferences);
    app.component('Bell', Bell);
    app.component('NovuProvider', NovuProvider);

    if (options)
      provide(
        NovuKey,
        ref(
          new Novu({
            applicationIdentifier: options.applicationIdentifier,
            subscriberId: options.subscriberId,
            subscriberHash: options.subscriberHash,
            backendUrl: options.backendUrl,
            socketUrl: options.socketUrl,
            useCache: options.useCache,
            __userAgent: `${baseUserAgent} ${options.userAgentType}`,
          })
        )
      );
  },
};
