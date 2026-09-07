import { useEffect, useRef } from 'react';

type MounterProps = {
  mount: (node: HTMLElement) => ((node: HTMLElement) => void) | void;
};

/**
 * Mounter allows you to mount a component to a DOM node.
 */
export function Mounter({ mount }: MounterProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
