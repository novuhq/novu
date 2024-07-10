import { ArrowDropDown } from '../../icons';

export const LoadingScreen = () => {
  return (
    <>
      <LoadingSkeleton />
      <LoadingSkeleton />
      <LoadingSkeleton />
      <LoadingSkeleton />
      <LoadingSkeleton />
      <LoadingSkeleton />
      <LoadingSkeleton />
      <LoadingSkeleton />
    </>
  );
};

const LoadingSkeleton = () => {
  return (
    <div class="nt-p-4 nt-flex nt-gap-1 nt-items-center nt-self-stretch nt-animate-pulse">
      <div class="nt-flex nt-flex-col nt-self-stretch nt-gap-1 nt-flex-1">
        <div class="nt-w-28 nt-h-3 nt-rounded nt-bg-foreground-alpha-300" />
        <div class="nt-w-60 nt-h-3 nt-rounded nt-bg-foreground-alpha-300" />
      </div>
      <div>
        <ArrowDropDown />
      </div>
    </div>
  );
};
