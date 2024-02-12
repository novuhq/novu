import { useMemo } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useDataRef } from '@novu/shared-web';

export const useInlineComponent: <T>(
  Component: ComponentType<T>,
  props: T & { children?: ReactNode }
) => ComponentType<{}> = (Component, props) => {
  const dataRef = useDataRef(props);

  return useMemo(() => {
    const componentName = Component.displayName || Component.name;

    const OuterComponent = () => <Component {...dataRef.current} />;

    OuterComponent.displayName = `${componentName}HOC`;

    return OuterComponent;
  }, [Component, dataRef]);
};
