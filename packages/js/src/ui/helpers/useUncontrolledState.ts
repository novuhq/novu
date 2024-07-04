import { Accessor, createSignal, Setter } from 'solid-js';

type UseUncontrolledState = {
  value?: boolean;
  fallbackValue?: boolean;
};

type UseUncontrolledStateOutput = [Accessor<boolean>, Setter<boolean>];

export function useUncontrolledState({ value, fallbackValue }: UseUncontrolledState): UseUncontrolledStateOutput {
  const [uncontrolledValue, setUncontrolledValue] = createSignal(!!fallbackValue);

  /**
   * If value is provided, return controlled state
   */
  if (value !== undefined) {
    const accessor: Accessor<boolean> = () => value;

    return [accessor, setUncontrolledValue];
  }

  /**
   * If value is not provided, return uncontrolled state
   */
  return [uncontrolledValue, setUncontrolledValue];
}
