import { Accessor, createSignal } from 'solid-js';

type UseUncontrolledState = {
  value?: boolean;
  fallbackValue?: boolean;
};

type UseUncontrolledStateOutput = [Accessor<boolean>, (value: boolean) => void];

export function useUncontrolledState({
  value,

  fallbackValue,
}: UseUncontrolledState): UseUncontrolledStateOutput {
  const [uncontrolledValue, setUncontrolledValue] = createSignal(!!fallbackValue);

  const handleUncontrolledChange = (val: boolean) => {
    setUncontrolledValue(val);
  };
  /**
   * If value is provided, return controlled state
   */
  if (value !== undefined) {
    const accessor: Accessor<boolean> = () => value;

    return [accessor, handleUncontrolledChange];
  }

  /**
   * If value is not provided, return uncontrolled state
   */
  return [uncontrolledValue, handleUncontrolledChange];
}
