import { For } from 'solid-js';
import { useStyle } from '../../../helpers';
import { ArrowDropDown } from '../../../icons';
import { SkeletonText } from '../../primitives/Skeleton';

export const LoadingScreen = () => {
  return <For each={Array.from({ length: 8 })}>{() => <LoadingSkeleton />}</For>;
};

const LoadingSkeleton = () => {
  const style = useStyle();

  return (
    <div
      class={style(
        'preferencesLoadingContainer',
        'nt-p-4 nt-flex nt-gap-1 nt-items-center nt-self-stretch nt-animate-pulse'
      )}
    >
      {/* eslint-disable-next-line local-rules/no-class-without-style */}
      <div class={'nt-flex nt-flex-col nt-self-stretch nt-gap-1 nt-flex-1'}>
        <SkeletonText appearanceKey="skeletonText" class="nt-w-1/3" />
        <SkeletonText appearanceKey="skeletonText" class="nt-w-1/3" />
      </div>
      <div>
        <ArrowDropDown />
      </div>
    </div>
  );
};
