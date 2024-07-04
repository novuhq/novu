import { Mounter } from '@/components/Mounter';

export default function Home() {
  return (
    <div className="h-screen w-full bg-neutral-100">
      <Mounter
        mount={(el) => {
          const NovuUI = require('@novu/js/ui').NovuUI;
          const ui = new NovuUI({
            options: {
              applicationIdentifier: 'applicationIdentifier',
              subscriberId: 'subscriberId',
            },
            appearance: {
              variables: { colorPrimary: 'purple' },
            },
          });
          console.log('mounting', ui);
          ui.mountInbox(el);

          setTimeout(() => {
            ui.updateAppearance({
              baseTheme: [{ variables: { colorForeground: 'blue', colorNeutral: 'white', colorBackground: 'black' } }],
              variables: { colorPrimary: 'purple' },
            });
          }, 5000);

          return () => {
            ui.unmountComponent(el);
          };
        }}
      />
    </div>
  );
}
