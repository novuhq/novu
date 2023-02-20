export function localNavigate() {
  const localStorageRouteStack = 'localStorageRouteStack';

  function localSet(stack: string[]) {
    localStorage.setItem(localStorageRouteStack, JSON.stringify(stack));
  }

  function localGet(): string[] | null {
    const res = localStorage.getItem(localStorageRouteStack);

    return res ? JSON.parse(res) : null;
  }

  function push(location: string) {
    const routeStack = localGet();

    if (!routeStack) {
      localSet([location]);

      return;
    }

    const index = routeStack.indexOf(location);
    const locationExistInStack = index !== -1;

    if (!locationExistInStack) {
      routeStack.push(location);
      localSet(routeStack);

      return;
    }
    normalizeRouteStack(routeStack, index);
  }

  function pop(): string[] | undefined {
    const stack = localGet();

    if (!stack || stack.length <= 1) return undefined;

    stack.pop();
    localSet(stack);

    return stack;
  }

  function peek(): string | undefined {
    const stack = localGet();

    if (!stack) return undefined;

    return stack.at(-1);
  }

  function normalizeRouteStack(routeStack: string[], index: number) {
    if (routeStack.length === index + 1) return;

    const res = routeStack.slice(0, index + 1);

    localSet(res);
  }

  return { push, pop, peek };
}
