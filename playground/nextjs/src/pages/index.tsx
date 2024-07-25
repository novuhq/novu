import { Mounter } from '@/components/Mounter';
import type { NovuUI, NovuUIOptions } from '@novu/js/ui';

export default function Home() {
  return (
    <div className="h-screen w-full bg-white">
      <Mounter
        mount={(el) => {
          //require here as it won't work in SSR.
          const { NovuUI } = require('@novu/js/ui');
          // we could import above and have types here but `mount` can't be async, since the unmount method is
          // returned and couldn't be used as a cleanup successfully.
          const ui = new (NovuUI as new (options: NovuUIOptions) => NovuUI)({
            options: {
              applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '',
              subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '',
              backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000',
              socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL ?? 'http://localhost:3002',
            },
            appearance: {},
          }) as NovuUI;
          ui.mountInbox(el);

          return () => {
            ui.unmountComponent(el);
          };
        }}
      />
    </div>
  );
}
