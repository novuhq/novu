import { Accessor, createSignal } from 'solid-js';

type UseUncontrolledState = {
  value?: boolean;
  defaultValue?: boolean;
  fallbackValue?: boolean;
  onChange?: (value: boolean) => void;
};

type UseUncontrolledStateOutput = [Accessor<boolean>, (value: boolean) => void];

export function useUncontrolledState({
  value,
  defaultValue,
  fallbackValue,
  onChange = () => {},
}: UseUncontrolledState): UseUncontrolledStateOutput {
  const [uncontrolledValue, setUncontrolledValue] = createSignal(
    defaultValue !== undefined ? defaultValue : !!fallbackValue
  );

  const handleUncontrolledChange = (val: boolean) => {
    setUncontrolledValue(val);
    onChange?.(val);
  };
  /**
   * If value is provided, return controlled state
   */
  if (value !== undefined) {
    const accessor: Accessor<boolean> = () => value;
    const setter = (val: boolean) => onChange?.(val);

    return [accessor, setter];
  }

  /**
   * If value is not provided, return uncontrolled state
   */
  return [uncontrolledValue, handleUncontrolledChange];
}
