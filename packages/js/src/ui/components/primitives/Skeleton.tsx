import type { AppearanceKey } from '../../types';
import { ClassName, cn, useStyle } from '../../helpers';

type SkeletonTextProps = { appearanceKey: AppearanceKey; class?: ClassName };
export const SkeletonText = (props: SkeletonTextProps) => {
  const style = useStyle();

  return (
    <div
      class={style(props.appearanceKey, cn('nt-w-full nt-h-3 nt-rounded nt-bg-foreground-alpha-100', props.class))}
    />
  );
};

type SkeletonAvatarProps = { appearanceKey: AppearanceKey; class?: ClassName };
export const SkeletonAvatar = (props: SkeletonAvatarProps) => {
  const style = useStyle();

  return (
    <div class={style(props.appearanceKey, cn('nt-size-8 nt-rounded-lg nt-bg-foreground-alpha-100', props.class))} />
  );
};
