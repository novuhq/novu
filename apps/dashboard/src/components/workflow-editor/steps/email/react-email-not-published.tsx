import { useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiExternalLinkLine, RiFileCopyLine, RiLoaderLine } from 'react-icons/ri';
import { Skeleton } from '@/components/primitives/skeleton';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { apiHostnameManager } from '@/utils/api-hostname-manager';

const CLI_DEFAULT_API_URL = 'https://api.novu.co';

function maskSecretKey(key: string): string {
  return `nv_${'•'.repeat(20)}${key.slice(-4)}`;
}

function buildPublishCommand({
  secretKey,
  workflowId,
  stepId,
  apiUrl,
  multiline,
}: {
  secretKey: string;
  workflowId: string;
  stepId: string;
  apiUrl: string | null;
  multiline: boolean;
}): string {
  const maskedKey = maskSecretKey(secretKey);
  const apiUrlFlag = apiUrl ? `--api-url=${apiUrl}` : null;

  if (multiline) {
    const lines = [
      `npx novu email publish \\`,
      `  --workflow=${workflowId} \\`,
      `  --step=${stepId} \\`,
      `  --secret-key=${maskedKey}${apiUrlFlag ? ' \\' : ''}`,
      ...(apiUrlFlag ? [`  ${apiUrlFlag}`] : []),
    ];

    return lines.join('\n');
  }

  const flags = [
    `--workflow=${workflowId}`,
    `--step=${stepId}`,
    `--secret-key=${secretKey}`,
    ...(apiUrlFlag ? [apiUrlFlag] : []),
  ];

  return `npx novu email publish ${flags.join(' ')}`;
}

function CodeBlock({ displayCommand, copyCommand }: { displayCommand: string; copyCommand: string }) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyCommand);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-[inset_0px_0px_0px_1px_#18181b,inset_0px_0px_0px_1.5px_rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between bg-[rgba(14,18,27,0.9)] px-4 py-2">
        <span className="text-label-xs text-[#99a0ae]">Terminal</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex size-6 items-center justify-center rounded p-1.5 transition-colors hover:bg-white/10"
        >
          {copied ? (
            <RiCheckLine className="size-3.5 text-[#99a0ae]" />
          ) : (
            <RiFileCopyLine className="size-3.5 text-[#99a0ae]" />
          )}
        </button>
      </div>
      <div className="bg-[rgba(14,18,27,0.9)] px-[5px] pb-[5px]">
        <div className="flex gap-4 rounded-lg border border-[rgba(14,18,27,0.9)] bg-[rgba(14,18,27,0.9)] p-3">
          <span className="shrink-0 font-mono text-xs text-[#525866]">❯</span>
          <span className="whitespace-pre font-mono text-xs text-white">{displayCommand}</span>
        </div>
      </div>
    </div>
  );
}

type Step = {
  label: string;
  description: React.ReactNode;
  displayCommand: string;
  copyCommand: string;
};

type ReactEmailNotPublishedProps = {
  workflowId: string;
  stepId: string;
};

export const ReactEmailNotPublished = ({ workflowId, stepId }: ReactEmailNotPublishedProps) => {
  const apiKeysQuery = useFetchApiKeys();
  const secretKey = apiKeysQuery.data?.data?.[0]?.key;

  const currentApiUrl = apiHostnameManager.getHostname();
  const apiUrl = currentApiUrl !== CLI_DEFAULT_API_URL ? currentApiUrl : null;

  const fallbackPublishDisplay = [
    `npx novu email publish \\`,
    `  --workflow=${workflowId} \\`,
    `  --step=${stepId} \\`,
    `  --secret-key=<your-secret-key>${apiUrl ? ' \\' : ''}`,
    ...(apiUrl ? [`  --api-url=${apiUrl}`] : []),
  ].join('\n');

  const fallbackPublishCopy = `npx novu email publish --workflow=${workflowId} --step=${stepId} --secret-key=<your-secret-key>${apiUrl ? ` --api-url=${apiUrl}` : ''}`;

  const steps: Step[] = [
    {
      label: 'New to React Email?',
      description: (
        <>
          Scaffold a starter project, or{' '}
          <a
            href="https://react.email/templates"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 transition-colors hover:text-[#0e121b]"
          >
            browse templates
            <RiExternalLinkLine className="size-3" />
          </a>
          .
        </>
      ),
      displayCommand: 'npx create-email@latest',
      copyCommand: 'npx create-email@latest',
    },
    {
      label: 'Link your React Email template to this step',
      description: (
        <>
          Run this from your project root — you'll be prompted to choose a React Email template to link to this step.
          <br />
          <br />💡 This bundles your template, links it to this step, and deploys it to our{' '}
          <span className="cursor-default decoration-dotted underline underline-offset-2">managed infrastructure</span>.
        </>
      ),
      displayCommand: secretKey
        ? buildPublishCommand({ secretKey, workflowId, stepId, apiUrl, multiline: true })
        : fallbackPublishDisplay,
      copyCommand: secretKey
        ? buildPublishCommand({ secretKey, workflowId, stepId, apiUrl, multiline: false })
        : fallbackPublishCopy,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#fbfbfb] px-16 pt-16">
      <div className="flex flex-col">
        {/* Timeline steps */}
        <div className="flex w-full flex-col">
          {steps.map((step, index) => (
            <div key={step.label} className="flex gap-0">
              <div className="flex flex-col items-center">
                <div className="z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f4f5f6] shadow-[0px_0px_0px_1px_white,0px_0px_0px_2px_#e1e4ea]">
                  <span className="text-label-xs text-[#0e121b]">{index + 1}</span>
                </div>
                <div className="w-px flex-1 bg-gradient-to-b from-neutral-200 to-neutral-100" />
              </div>
              <div className="flex flex-col gap-6 pb-8 pl-6">
                <div className="flex flex-col gap-1.5">
                  <p className="text-label-sm text-[#2f3037]">{step.label}</p>
                  <p className="text-label-xs max-w-[440px] text-[#99a0ae]">{step.description}</p>
                </div>
                {index === 1 && apiKeysQuery.isLoading ? (
                  <Skeleton className="h-[120px] w-full rounded-xl" />
                ) : (
                  <CodeBlock displayCommand={step.displayCommand} copyCommand={step.copyCommand} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status footer */}
        <div className="flex gap-0">
          <div className="flex shrink-0 flex-col items-center">
            <RiLoaderLine className="size-5 animate-spin text-pink-500" />
          </div>
          <div className="flex flex-col gap-1.5 pb-8 pl-6">
            <span className="text-label-sm bg-gradient-to-r from-[#dd2476] to-[#ff512f] bg-clip-text text-transparent">
              Waiting for React Email template...
            </span>
            <p className="text-label-xs text-[#99a0ae]">
              Once your React Email template is linked, you'll be able to preview it here and trigger your first
              notification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
