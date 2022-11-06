import { Plugin } from 'vue';

import { applyPolyfills, defineCustomElements } from '@novu/notification-center/loader';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ComponentLibrary: Plugin = {
  async install() {
    applyPolyfills().then(() => defineCustomElements());
  },
};
