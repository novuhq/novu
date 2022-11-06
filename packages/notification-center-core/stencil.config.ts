import { Config } from '@stencil/core';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';

export const config: Config = {
  namespace: 'notification-center-core',
  taskQueue: 'async',
  preamble: 'Novu - Notification Center',
  outputTargets: [
    reactOutputTarget({
      componentCorePackage: '@novu/notification-center-core',
      proxiesFile: '../notification-center-react/src/components/generated/index.ts',
      includeDefineCustomElements: true,
    }),
    vueOutputTarget({
      componentCorePackage: '@novu/notification-center-core',
      proxiesFile: '../notification-center-vue/src/components/generated/index.ts',
    }),
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
    },
  ],
};
