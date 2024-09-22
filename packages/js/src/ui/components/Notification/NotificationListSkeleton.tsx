import { For } from 'solid-js';
import { SkeletonAvatar, SkeletonText } from '../primitives/Skeleton';

export const NotificationSkeleton = () => {
  return (
    <>
      {/* eslint-disable-next-line local-rules/no-class-without-style */}
      <div class="nt-flex nt-gap-2 nt-px-6 nt-py-4 nt-w-full">
        <SkeletonAvatar appearanceKey="skeletonAvatar" />
        {/* eslint-disable-next-line local-rules/no-class-without-style */}
        <div class={'nt-flex nt-flex-col nt-self-stretch nt-gap-3 nt-flex-1'}>
          <SkeletonText appearanceKey="skeletonText" class="nt-w-1/4" />
          {/* eslint-disable-next-line local-rules/no-class-without-style */}
          <div class="nt-flex nt-gap-1">
            <SkeletonText appearanceKey="skeletonText" />
            <SkeletonText appearanceKey="skeletonText" />
          </div>
          {/* eslint-disable-next-line local-rules/no-class-without-style */}
          <div class="nt-flex nt-gap-1">
            <SkeletonText appearanceKey="skeletonText" class="nt-w-2/3" />
            <SkeletonText appearanceKey="skeletonText" class="nt-w-1/3" />
          </div>
        </div>
      </div>
    </>
  );
};

type NotificationListSkeletonProps = {
  count: number;
};
export const NotificationListSkeleton = (props: NotificationListSkeletonProps) => {
  return <For each={Array.from({ length: props.count })}>{() => <NotificationSkeleton />}</For>;
};
