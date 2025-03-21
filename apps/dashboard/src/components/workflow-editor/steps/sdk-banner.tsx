import { RiInformation2Line } from 'react-icons/ri';

export function SdkBanner() {
  return (
    <div className="flex flex-col gap-2 rounded-sm border p-2">
      <div className="flex gap-1">
        <RiInformation2Line className="text-warning size-5 font-medium" />
        <span className="text-xs">Step configuration is only available via our SDKs currently.</span>
      </div>
      <span className="text-foreground-600 text-xs">
        We're bringing support for all step types to the dashboard. In the meantime, you can continue to use our{' '}
        <a
          href="https://docs.novu.co/framework/typescript/overview"
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          SDKs.
        </a>
      </span>
    </div>
  );
}
