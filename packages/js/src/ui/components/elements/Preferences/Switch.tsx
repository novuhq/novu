import { useStyle } from '../../../helpers';

type SwitchProps = {
  checked?: boolean;
  onChange: (checked: boolean) => void;
};

export const Switch = (props: SwitchProps) => {
  const style = useStyle();

  return (
    <label
      class={style(
        'channelSwitch',
        `nt-relative
    nt-inline-flex nt-cursor-pointer nt-items-center`
      )}
    >
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
          `nt-peer nt-h-6 nt-w-11 nt-rounded-full nt-border nt-bg-slate-200
          after:nt-absolute after:nt-left-[2px] after:nt-top-0.5 after:nt-h-5
          after:nt-w-5 after:nt-rounded-full after:nt-border
          after:nt-border-gray-300
          after:nt-bg-white after:nt-transition-all after:nt-content-['']
          peer-checked:nt-bg-primary peer-checked:after:nt-translate-x-full
          peer-checked:after:nt-border-white peer-focus:nt-ring-green-300`
        )}
      />
    </label>
  );
};
