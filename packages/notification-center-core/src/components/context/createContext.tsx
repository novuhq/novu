import { FunctionalComponent, h } from '@stencil/core';

export const createContext = <T extends { [key: string]: any }>(defaultValue: T, contextName: string) => {
  const Provider: FunctionalComponent<{
    value?: T;
  }> = (props, children) => {
    const resolvedValue: T = (props && props.value) || defaultValue;

    return (
      <stencil-provider STENCIL_CONTEXT={resolvedValue} contextName={contextName}>
        {children}
      </stencil-provider>
    );
  };

  const Consumer: FunctionalComponent<{
    name?: string;
  }> = (_, children) => {
    if (!children.length) {
      return console.warn('[stencil-context] You must pass <Consumer> a single child that is a Function.');
    }

    const renderer = children[0];

    if (!(renderer instanceof Function)) {
      return console.warn('[stencil-context] <Consumer> first child must be a Function.');
    }

    return <stencil-consumer contextName={contextName} renderer={renderer} />;
  };

  return {
    Provider,
    Consumer,
  };
};
