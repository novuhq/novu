import { ClassName, cn, useStyle } from '../../helpers';
import type { AppearanceKey } from '../../types';

type SkeletonTextProps = { appearanceKey: AppearanceKey; class?: ClassName };
export const SkeletonText = (props: SkeletonTextProps) => {
  const style = useStyle();

  return (
    <div
      class={style(
        props.appearanceKey,
        cn('nt-w-full nt-h-3 nt-rounded nt-bg-gradient-to-r nt-from-foreground-alpha-50 nt-to-transparent', props.class)
      )}
    />
  );
};

type SkeletonAvatarProps = { appearanceKey: AppearanceKey; class?: ClassName };
export const SkeletonAvatar = (props: SkeletonAvatarProps) => {
  const style = useStyle();

  return (
    <div
      class={style(
        props.appearanceKey,
        cn('nt-size-8 nt-rounded-lg nt-bg-gradient-to-r nt-from-foreground-alpha-50 nt-to-transparent', props.class)
      )}
    />
  );
};

type SkeletonSwitchProps = { appearanceKey: AppearanceKey; thumbAppearanceKey: AppearanceKey; class?: ClassName };

export const SkeletonSwitch = (props: SkeletonSwitchProps) => {
  const style = useStyle();

  return (
    <div class={style(props.appearanceKey, cn('nt-relative nt-inline-flex nt-items-center', props.class))}>
      {/* The track */}
      <div
        class={style(
          props.appearanceKey,
          'nt-h-4 nt-w-7 nt-rounded-full nt-bg-gradient-to-r nt-from-foreground-alpha-50 nt-to-transparent'
        )}
      />
      {/* The thumb */}
      <div
        class={style(
          props.thumbAppearanceKey,
          'nt-absolute nt-top-0.5 nt-left-0.5 nt-size-3 nt-rounded-full nt-bg-background nt-shadow'
        )}
      />
    </div>
  );
};
