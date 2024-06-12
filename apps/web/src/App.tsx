import { AppRoutes } from './AppRoutes';
import Providers from './Providers';
import { ApplicationReadyGuard } from './ApplicationReadyGuard';
import { UI } from '@novu/js';

export default function App() {
  return (
    <Providers>
      <ApplicationReadyGuard>
        <AppRoutes />
        <Mounter mount={(el) => {}} />
      </ApplicationReadyGuard>
    </Providers>
  );
}

// export const novu = Novu({});

import { useLayoutEffect, useRef } from 'react';

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
