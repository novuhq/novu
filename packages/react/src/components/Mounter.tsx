import React from 'react';

type MounterProps = {
  mount: (node: HTMLElement) => ((node: HTMLElement) => void) | void;
};

export function Mounter({ mount }: MounterProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let unmount: (node: HTMLDivElement) => void | undefined;
    const element = ref.current;
    if (element && mount) {
      const possibleUnmount = mount(element);
      if (possibleUnmount) {
        unmount = possibleUnmount;
      }
    }

    return () => {
      if (element && unmount) {
        unmount(element);
      }
    };
  }, [ref, mount]);

  return <div ref={ref} />;
}
