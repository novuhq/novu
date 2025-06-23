import { RiFileList3Line } from 'react-icons/ri';

export function LogsDetailEmpty() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <RiFileList3Line className="h-6 w-6 text-neutral-500" />
        </div>
        <div>
          <h3 className="text-foreground-900 text-sm font-medium">Select a log to view details</h3>
          <p className="text-foreground-600 text-xs">
            Click on any log entry to see detailed information about the request and response.
          </p>
        </div>
      </div>
    </div>
  );
}
