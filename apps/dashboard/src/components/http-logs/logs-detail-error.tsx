import { RiErrorWarningLine } from 'react-icons/ri';

export function LogsDetailError() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
          <RiErrorWarningLine className="text-destructive h-6 w-6" />
        </div>
        <div>
          <h3 className="text-foreground-900 text-sm font-medium">Unable to load log details</h3>
          <p className="text-foreground-600 text-xs">There was an error loading the details for this log entry.</p>
        </div>
      </div>
    </div>
  );
}
