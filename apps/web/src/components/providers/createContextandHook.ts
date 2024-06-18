import React from 'react';

export function assertContextExists(contextVal: unknown, msgOrCtx: string | React.Context<any>): asserts contextVal {
  if (!contextVal) {
    throw typeof msgOrCtx === 'string' ? new Error(msgOrCtx) : new Error(`${msgOrCtx.displayName} not found`);
  }
}

type Options = { assertCtxFn?: (v: unknown, msg: string) => void };
type ContextOf<T> = React.Context<{ value: T } | undefined>;
type UseCtxFn<T> = () => T;

/**
 *
 * Nice little utility function from https://github.com/clerk/javascript/blob/main/packages/shared/src/react/hooks/createContextAndHook.ts
 *
 * Creates and returns a Context and two hooks that return the context value.
 * The Context type is derived from the type passed in by the user.
 * The first hook returned guarantees that the context exists so the returned value is always CtxValue
 * The second hook makes no guarantees, so the returned value can be CtxValue | undefined
 *
 */
export const createContextAndHook = <CtxVal>(
  displayName: string,
  options?: Options
): [ContextOf<CtxVal>, UseCtxFn<CtxVal>, UseCtxFn<CtxVal | Partial<CtxVal>>] => {
  const { assertCtxFn = assertContextExists } = options || {};
  const Ctx = React.createContext<{ value: CtxVal } | undefined>(undefined);
  Ctx.displayName = displayName;

  const useCtx = () => {
    const ctx = React.useContext(Ctx);
    assertCtxFn(ctx, `${displayName} not found`);

    return (ctx as any).value as CtxVal;
  };

  const useCtxWithoutGuarantee = () => {
    const ctx = React.useContext(Ctx);

    return ctx ? ctx.value : {};
  };

  return [Ctx, useCtx, useCtxWithoutGuarantee];
};
