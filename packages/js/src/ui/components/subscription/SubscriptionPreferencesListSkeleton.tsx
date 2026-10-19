import { useStyle } from '../../helpers/useStyle';
import { SkeletonText } from '../primitives/Skeleton';

export const SubscriptionPreferencesListSkeleton = () => {
  const style = useStyle();

  return (
    <div
      class={style({
        key: 'preferencesList__skeletonContent',
        className: 'nt-flex nt-flex-col nt-w-full nt-gap-3 nt-py-2',
      })}
    >
      <div
        class={style({
          key: 'preferencesList__skeletonItem',
          className: 'nt-flex nt-items-center nt-justify-between',
        })}
      >
        <SkeletonText
          appearanceKey="notificationList__skeletonText"
          class="nt-h-3.5 nt-w-1/3 nt-bg-neutral-alpha-50 nt-rounded-sm nt-animate-shimmer"
        />
        <SkeletonText
          appearanceKey="preferencesList__skeletonText"
          class="nt-size-4 nt-bg-neutral-alpha-50 nt-rounded-sm nt-animate-shimmer"
        />
      </div>
      <div
        class={style({
          key: 'preferencesList__skeletonItem',
          className: 'nt-flex nt-items-center nt-justify-between',
        })}
      >
        <SkeletonText
          appearanceKey="notificationList__skeletonText"
          class="nt-h-3.5 nt-w-1/3 nt-bg-neutral-alpha-50 nt-rounded-sm nt-animate-shimmer"
        />
        <SkeletonText
          appearanceKey="preferencesList__skeletonText"
          class="nt-size-4 nt-bg-neutral-alpha-50 nt-rounded-sm nt-animate-shimmer"
        />
      </div>
      <div
        class={style({
          key: 'preferencesList__skeletonItem',
          className: 'nt-flex nt-items-center nt-justify-between',
        })}
      >
        <SkeletonText
          appearanceKey="notificationList__skeletonText"
          class="nt-h-3.5 nt-w-1/3 nt-bg-neutral-alpha-50 nt-rounded-sm nt-animate-shimmer"
        />
        <SkeletonText
          appearanceKey="preferencesList__skeletonText"
          class="nt-size-4 nt-bg-neutral-alpha-50 nt-rounded-sm nt-animate-shimmer"
        />
      </div>
    </div>
  );
};
