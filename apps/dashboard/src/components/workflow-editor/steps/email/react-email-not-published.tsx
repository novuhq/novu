import { useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiFileCopyLine, RiLoaderLine } from 'react-icons/ri';

function CodeBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
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
          <span className="font-mono text-xs text-white">{command}</span>
        </div>
      </div>
    </div>
  );
}

const buildSteps = (workflowId: string, stepId: string) => {
  const publishArgs = [workflowId ? `--workflow=${workflowId}` : null, stepId ? `--step=${stepId}` : null]
    .filter(Boolean)
    .join(' ');

  const publishCommand = publishArgs ? `npx novu email publish ${publishArgs}` : 'npx novu email publish';

  return [
    {
      label: 'Install the Novu CLI',
      description: 'The npm package needed to initialize and publish React Email templates.',
      command: 'npm install @novu/cli',
    },
    {
      label: 'Initialize your email templates',
      description:
        'Scans your project for React Email templates and generates step handler files. Run this from your project root — it will prompt you to link templates to workflow steps.',
      command: 'npx novu email init',
    },
    {
      label: 'Publish to link this step',
      description:
        "Bundles your template, deploys it to Novu's managed infrastructure, and links it to this workflow step.",
      command: publishCommand,
    },
  ];
};

type ReactEmailNotPublishedProps = {
  workflowId: string;
  stepId: string;
};

export const ReactEmailNotPublished = ({ workflowId, stepId }: ReactEmailNotPublishedProps) => {
  const steps = buildSteps(workflowId, stepId);

  return (
    <div className="h-full overflow-y-auto bg-[#fbfbfb] px-8 pt-8">
      <div className="flex flex-col">
        {/* Timeline steps */}
        <div className="flex w-full flex-col">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <div key={step.label} className="flex gap-0">
                <div className="flex flex-col items-center">
                  <div className="z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f4f5f6] shadow-[0px_0px_0px_1px_white,0px_0px_0px_2px_#e1e4ea]">
                    <span className="text-label-xs text-[#0e121b]">{index + 1}</span>
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-neutral-200 to-neutral-100" />}
                </div>
                <div className="flex flex-col gap-6 pb-8 pl-6">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-label-sm text-[#2f3037]">{step.label}</p>
                    <p className="text-label-xs max-w-[440px] text-[#99a0ae]">{step.description}</p>
                  </div>
                  <CodeBlock command={step.command} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Status footer */}
        <div className="flex flex-col gap-2 py-4">
          <div className="flex items-center gap-1.5">
            <RiLoaderLine className="size-5 animate-spin text-pink-500" />
            <span className="text-label-sm bg-gradient-to-r from-[#dd2476] to-[#ff512f] bg-clip-text text-transparent">
              Waiting for React.Email template...
            </span>
          </div>
          <p className="text-label-xs text-[#99a0ae]">
            Once your React Email template is published, you'll be able to preview it here and trigger your first
            notification.
          </p>
        </div>
      </div>
    </div>
  );
};
