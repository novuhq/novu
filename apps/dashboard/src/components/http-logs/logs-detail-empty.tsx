import { EmptyTopicsIllustration } from '../topics/empty-topics-illustration';

export function RequestLogDetailEmptyState2() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <EmptyTopicsIllustration />
        </div>
        <div>
          <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
            Nothing to show,
            <br />
            Select an log on the left to view detailed info here
          </p>
        </div>
      </div>
    </div>
  );
}

export function RequestLogDetailEmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-center">
      <EmptyTopicsIllustration />
      <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
        Nothing to show,
        <br />
        Select an log on the left to view detailed info here
      </p>
    </div>
  );
}
