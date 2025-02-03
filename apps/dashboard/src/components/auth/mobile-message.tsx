import { Smartphone } from 'lucide-react';

export function MobileMessage() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
        <Smartphone className="h-8 w-8 text-gray-500" />
      </div>
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Desktop Setup Required</h1>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-950">Workspace setup is not available on mobile devices</p>
          <p className="text-sm text-gray-500">
            We've sent setup instructions to your email. Please continue on a desktop browser to complete the process.
          </p>
          <p className="text-primary text-sm font-medium">Can't find the email? Check your spam folder.</p>
        </div>
      </div>
    </div>
  );
}
