import { useStyle } from '../../../helpers';

type SwitchProps = {
  checked?: boolean;
  onChange: (checked: boolean) => void;
};

export const Switch = (props: SwitchProps) => {
  const style = useStyle();

  return (
    <label class={style('channelSwitch', `nt-relative nt-inline-flex nt-cursor-pointer nt-items-center`)}>
      <input
        type="checkbox"
        // eslint-disable-next-line local-rules/no-class-without-style
        class="nt-peer nt-sr-only"
        checked={props.checked}
        onChange={(e) => {
          props.onChange(e.target.checked);
        }}
      />
      <div
        class={style(
          'channelSwitchThumb',
          `nt-peer nt-h-4 nt-w-7 nt-rounded-full peer-checked:nt-shadow-none peer-checked:nt-border-neutral-alpha-400 nt-bg-neutral-alpha-300 after:nt-absolute after:nt-top-0.5 after:nt-size-3 after:nt-left-0.5 after:nt-rounded-full after:nt-bg-background after:nt-transition-all after:nt-content-[''] peer-checked:nt-bg-primary peer-checked:after:nt-translate-x-full peer-checked:after:nt-border-background nt-transition-all nt-duration-200 after:nt-duration-200 shadow-sm`
        )}
        data-checked={props.checked}
      />
    </label>
  );
};
