import { RouteFill } from '@/components/icons/route-fill';
import { Skeleton } from '@/components/primitives/skeleton';
import { SidebarContent, SidebarHeader } from '@/components/side-navigation/sidebar';

export function EditorAsideSkeleton() {
  return (
    <>
      <SidebarHeader className="items-center border-b py-3 text-sm font-medium">
        <div className="flex items-center gap-1">
          <RouteFill />
          <span>Configure workflow</span>
        </div>
      </SidebarHeader>
      <SidebarContent size="md">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </SidebarContent>
    </>
  );
}

export function WorkflowEditorSkeleton() {
  return (
    <div className="flex h-full w-full flex-1 flex-nowrap">
      <div className="-mt-px flex h-full max-w-full flex-1 flex-col">
        <div className="border-neutral-alpha-200 relative flex h-11 w-full items-center gap-6 border-b border-t px-3.5">
          <span className="text-foreground-950 text-label-sm relative px-1 py-3.5 font-medium">
            Workflow
            <span className="bg-primary absolute inset-x-1 bottom-0 h-0.5" />
          </span>
          <span className="text-foreground-600 text-label-sm px-1 py-3.5 font-medium">Activity</span>
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
        </div>

        <div className="flex h-full min-h-0 max-w-full flex-1 overflow-hidden">
          <div className="border-neutral-200 flex h-full w-11 shrink-0 flex-col items-center border-r">
            <Skeleton className="mt-2 size-7 rounded-md" />
            <Skeleton className="mt-auto mb-2 size-7 rounded-md" />
          </div>

          <div
            className="bg-bg-weak relative flex flex-1 items-start justify-center overflow-hidden pt-16"
            style={{
              backgroundImage: 'radial-gradient(circle, hsl(var(--bg-muted)) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <div className="flex flex-col items-center">
              <Skeleton className="h-16 w-[300px] rounded-xl" />
              <Skeleton className="h-8 w-px rounded-none" />
              <Skeleton className="h-16 w-[300px] rounded-xl" />
              <Skeleton className="h-8 w-px rounded-none" />
              <Skeleton className="h-16 w-[300px] rounded-xl" />
              <Skeleton className="mt-2 size-6 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <aside className="flex h-full w-[350px] max-w-[350px] shrink-0 flex-col border-l">
        <EditorAsideSkeleton />
      </aside>
    </div>
  );
}
