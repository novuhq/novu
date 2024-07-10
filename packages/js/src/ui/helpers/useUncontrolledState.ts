import { Accessor, createEffect, createSignal, Setter } from 'solid-js';

type UseUncontrolledState = {
  value?: boolean;
  fallbackValue?: boolean;
};

type UseUncontrolledStateOutput = [Accessor<boolean>, Setter<boolean>];

export function useUncontrolledState(props: UseUncontrolledState): UseUncontrolledStateOutput {
  const [uncontrolledValue, setUncontrolledValue] = createSignal(!!props.fallbackValue);

  /**
   * If value is provided, return controlled state
   */
  if (props.value !== undefined) {
    const accessor: Accessor<boolean> = () => !!props.value;

    return [accessor, setUncontrolledValue];
  }

  /**
   * If value is not provided, return uncontrolled state
   */
  return [uncontrolledValue, setUncontrolledValue];
}
