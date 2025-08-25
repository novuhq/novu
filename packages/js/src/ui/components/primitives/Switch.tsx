import { cn, useStyle } from '../../helpers';

export type SwitchState = 'enabled' | 'disabled' | 'indeterminate';

export type SwitchProps = {
  state?: SwitchState;
  onChange: (state: SwitchState) => void;
  disabled?: boolean;
};

export const Switch = (props: SwitchProps) => {
  const style = useStyle();

  const handleChange = () => {
    if (props.disabled) return;

    const nextState = getNextState(props.state ?? 'disabled');
    props.onChange(nextState);
  };

  const getNextState = (currentState: SwitchState): SwitchState => {
    switch (currentState) {
      case 'enabled':
        return 'disabled';
      case 'disabled':
        return 'enabled';
      case 'indeterminate':
        return 'enabled';
      default:
        return 'disabled';
    }
  };

  const isChecked = () => props.state === 'enabled';
  const isIndeterminate = () => props.state === 'indeterminate';
  const state = () => props.state;
  const disabled = () => props.disabled;

  return (
    <label
      class={style({
        key: 'channelSwitch',
        className: cn('nt-relative nt-inline-flex nt-cursor-pointer nt-items-center', {
          'nt-opacity-50 nt-cursor-not-allowed': disabled(),
        }),
      })}
    >
      <input type="checkbox" class="nt-sr-only" checked={isChecked()} disabled={disabled()} onChange={handleChange} />
      <div
        class={style({
          key: 'channelSwitchThumb',
          className: cn(
            `nt-h-4 nt-w-7 nt-rounded-full nt-bg-neutral-alpha-300 after:nt-absolute after:nt-top-0.5 after:nt-size-3 after:nt-left-0.5 after:nt-rounded-full after:nt-bg-background after:nt-transition-all after:nt-content-[''] nt-transition-all nt-duration-200 after:nt-duration-200 shadow-sm`,
            {
              'nt-bg-primary nt-shadow-none nt-border-neutral-alpha-400 after:nt-translate-x-full after:nt-border-background':
                isChecked(),
              'after:nt-translate-x-1/2': isIndeterminate(),
            }
          ),
        })}
        data-state={state()}
      />
    </label>
  );
};
