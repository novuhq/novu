import { RiMailLine } from 'react-icons/ri';

function SkeletonRect({ className }: { className: string }) {
  return (
    <div
      className={`rounded-[4px] bg-gradient-to-r from-[#f1efef] via-[#f9f8f8] to-[rgba(249,248,248,0.75)] ${className}`}
    />
  );
}

function EmptyPreviewIllustration() {
  return (
    <div className="flex flex-col items-center">
      {/* Top card — dashed border */}
      <div className="w-[136px] rounded-lg border border-dashed border-[#e1e4ea] p-1">
        <div className="flex items-center justify-center rounded-md border border-[#f2f5f8] bg-white py-3">
          <RiMailLine className="size-4 text-[#cacfd8]" />
        </div>
      </div>

      {/* Connector */}
      <div className="h-[33px] w-px bg-[#e1e4ea]" />

      {/* Bottom card — email editor mockup */}
      <div className="rounded-lg border border-[#f2f5f8] p-1">
        <div className="flex w-[197px] flex-col overflow-hidden rounded-md border border-[#e1e4ea] bg-white">
          {/* Header row */}
          <div className="flex items-center gap-1.5 border-b border-[#f2f5f8] p-2">
            <div className="size-4 shrink-0 rounded-full bg-[#e1e4ea]" />
            <div className="flex flex-col gap-[3px]">
              <SkeletonRect className="h-[5px] w-[44px]" />
              <SkeletonRect className="h-[5px] w-[77px]" />
            </div>
          </div>

          {/* Body */}
          <div className="flex items-start justify-center bg-[#fbfbfb] px-6 py-4">
            <div className="flex w-full flex-col gap-2.5 rounded-md bg-white p-2">
              {/* Title skeleton */}
              <div className="flex flex-col gap-[3px]">
                <SkeletonRect className="size-3" />
                <SkeletonRect className="h-[4px] w-[77px]" />
              </div>

              {/* Body text skeleton */}
              <div className="flex flex-wrap gap-[3px]">
                <SkeletonRect className="h-[4px] w-[63px]" />
                <SkeletonRect className="h-[4px] w-[31px]" />
                <SkeletonRect className="h-[4px] min-w-[20px] flex-1" />
                <SkeletonRect className="h-[4px] w-[45px]" />
                <SkeletonRect className="h-[4px] w-[34px]" />
              </div>

              {/* Footer line */}
              <SkeletonRect className="h-[4px] w-[25px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StepResolverEmptyPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 pt-8">
      <EmptyPreviewIllustration />
      <div className="flex flex-col items-center gap-1">
        <p className="text-label-xs font-medium text-[#99a0ae]">Nothing to preview</p>
        <p className="text-label-xs text-[#99a0ae]">Publish your step handler to see a preview.</p>
      </div>
    </div>
  );
}
