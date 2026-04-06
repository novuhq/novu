import { EmptyTopicsIllustration } from '../topics/empty-topics-illustration';

export function RequestLogDetailEmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-center">
      <EmptyTopicsIllustration />
      <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
        Nothing to show,
        <br />
        Select a log on the left to view detailed info here
      </p>
    </div>
  );
}
