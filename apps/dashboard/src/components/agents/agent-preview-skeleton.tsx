import { Skeleton } from '@/components/primitives/skeleton';
import { SetupStep } from './setup-guide-primitives';

const BRAIN_STEP_TITLE = 'What should your agent do?';
const BRAIN_STEP_DESCRIPTION =
  "We'll provide demo Claude credentials so you can set up an agent without bringing your own keys. Later, you can replace it with your own agent and credentials.";

function PreviewSectionSkeleton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text-soft text-code-xs font-normal uppercase leading-4 tracking-[0.4px]">{label}</span>
      {children}
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="bg-bg-weak border-stroke-weak flex flex-col gap-1 rounded-[8px] border p-1">
      <div className="border-stroke-soft bg-bg-white relative overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="bg-bg-weak flex h-8 items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>

        <div className="flex flex-col gap-5 px-2 pb-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>

          <PreviewSectionSkeleton label="MCPs">
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </PreviewSectionSkeleton>

          <PreviewSectionSkeleton label="Tools">
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </PreviewSectionSkeleton>

          <PreviewSectionSkeleton label="Instructions">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </PreviewSectionSkeleton>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading placeholder shown while an agent is provisioned directly from a deep-linked template
 * (marketing website). Mirrors the brain-step `SetupStep` + `AgentCard` layout so the swap into the
 * real `ManagedAgentRecap` preview reads as an in-place reveal rather than a layout shift.
 */
export function AgentPreviewSkeleton() {
  return (
    <SetupStep
      index={1}
      status="current"
      title={BRAIN_STEP_TITLE}
      description={BRAIN_STEP_DESCRIPTION}
      fullWidthContent={<AgentCardSkeleton />}
    />
  );
}
