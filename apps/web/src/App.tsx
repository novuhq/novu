import { AppRoutes } from './AppRoutes';
import Providers from './Providers';
import { ApplicationReadyGuard } from './ApplicationReadyGuard';
import { InboxUI } from '@novu/js/ui';
import '@novu/js/ui/index.css';
import { useLayoutEffect, useRef } from 'react';

export default function App() {
  return (
    <Providers>
      <Mounter
        mount={(el) => {
          const ui = new InboxUI();
          console.log('mounting', ui);
          ui.mount(el, {
            name: 'biswa from Solid-js rendered inside React.js',
            options: {
              applicationIdentifier: 'm7AN8wFPlJKX',
              subscriberId: '1234',
            },
          });
        }}
      />

      <ApplicationReadyGuard>
        <AppRoutes />
      </ApplicationReadyGuard>
    </Providers>
  );
}

// export const novu = Novu({});

type MountProps = {
  mount: (node: HTMLDivElement) => void;
  unmount?: (node: HTMLDivElement) => void;
};

export function Mounter({ mount, unmount }: MountProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const elementRef = ref.current;
    if (elementRef && mount) {
      mount(elementRef);
    }

    return () => {
      if (elementRef && unmount) {
        unmount(elementRef);
      }
    };
  }, [ref, mount, unmount]);

  return <div ref={ref} />;
}
