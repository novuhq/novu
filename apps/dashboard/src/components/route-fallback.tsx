import { RiLoader4Line } from 'react-icons/ri';

export function RouteFallback() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <RiLoader4Line className="text-primary-base size-8 animate-spin" aria-label="Loading" />
    </div>
  );
}
