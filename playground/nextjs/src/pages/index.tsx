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
              applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID,
              subscriberId: '1234',
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
