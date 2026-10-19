import { type PreviewError } from '@novu/shared';
import { RiErrorWarningLine } from 'react-icons/ri';

export function StepResolverPreviewError({ error }: { error: PreviewError }) {
  return (
    <div className="flex h-full items-start justify-center bg-neutral-50 p-10">
      <div className="w-full max-w-[480px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <RiErrorWarningLine className="text-destructive size-3" />
          </div>
          <span className="text-foreground-950 text-[13px] font-medium leading-none tracking-tight">{error.title}</span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <pre className="text-foreground-600 whitespace-pre-wrap break-words rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[12px] leading-relaxed">
            {error.message}
          </pre>
          <p className="text-foreground-500 text-[12px] leading-relaxed">{error.hint}</p>
        </div>
      </div>
    </div>
  );
}
