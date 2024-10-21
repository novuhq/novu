import React from 'react';

export function assertContextExists<T>(contextVal: unknown, msgOrCtx: string | React.Context<T>): asserts contextVal {
  if (!contextVal) {
    throw typeof msgOrCtx === 'string' ? new Error(msgOrCtx) : new Error(`${msgOrCtx.displayName} not found`);
  }
}

type UseCtxFn<T> = () => T;

export const createContextHook = <CtxVal>(context: React.Context<CtxVal>): UseCtxFn<CtxVal> => {
  const useCtx = () => {
    const ctx = React.useContext(context);
    assertContextExists(ctx, `${context.displayName} not found`);

    return ctx;
  };

  return useCtx;
};
