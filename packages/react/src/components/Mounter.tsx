import type { MountHandle, NovuUI } from '@novu/js/ui';
import { useRef } from 'react';
import { useNovuUI } from '../context/NovuUIContext';
import { useIsomorphicLayoutEffect } from '../hooks/internal/useIsomorphicLayoutEffect';

type MountComponentParams = Parameters<NovuUI['mountComponent']>[0];

export type MounterProps = {
  name: MountComponentParams['name'];
  props?: MountComponentParams['props'];
  /** Mount as an island: no `Root` wrapper, no layout box. For mount points inside DOM that already sits under an engine root. */
  bare?: boolean;
};

/**
 * A mount point: a DOM node the host hands to the engine so the engine can render a component into it.
 *
 * Mounts before the browser paints, pushes later prop changes through the engine's handle instead of mounting
 * again, and unmounts when React removes it.
 */
export function Mounter({ name, props, bare }: MounterProps) {
  const { novuUI } = useNovuUI();
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MountHandle<MountComponentParams['props']> | null>(null);
  const latestProps = useRef(props);
  latestProps.current = props;

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    handleRef.current = novuUI.mountComponent({ name, element, props: latestProps.current, bare });

    return () => {
      handleRef.current?.unmount();
      handleRef.current = null;
    };
  }, [novuUI, name, bare]);

  useIsomorphicLayoutEffect(() => {
    handleRef.current?.update(props);
  }, [props]);

  return <div ref={ref} style={bare ? { display: 'contents' } : undefined} />;
}
