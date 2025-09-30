import { useMemo } from 'react';
import { RiRouteFill } from 'react-icons/ri';
import type { IResourceDependency, IResourceDiffResult } from '@/api/environments';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

type LayoutUsageIndicatorProps = {
  layoutResource: IResourceDiffResult;
  allWorkflows: IResourceDiffResult[];
  dependencies: Map<string, IResourceDependency[]>;
};

export function LayoutUsageIndicator({ layoutResource, allWorkflows, dependencies }: LayoutUsageIndicatorProps) {
  const layoutName = layoutResource.sourceResource?.name || layoutResource.targetResource?.name;
  const layoutId = layoutResource.sourceResource?.id || layoutResource.targetResource?.id;

  // Find workflows that depend on this layout
  const workflowsUsingLayout = useMemo(() => {
    const workflows: Array<{ name: string; slug: string }> = [];

    dependencies.forEach((deps, workflowId) => {
      const workflow = allWorkflows.find(
        (w) => w.sourceResource?.id === workflowId || w.targetResource?.id === workflowId
      );

      if (
        workflow &&
        deps.some((dep) => {
          // Match by resource ID first (most reliable), then by resource name
          return dep.resourceId === layoutId || dep.resourceName === layoutName;
        })
      ) {
        const workflowName = workflow.sourceResource?.name || workflow.targetResource?.name;
        const workflowSlug = workflowName?.toLowerCase().replace(/\s+/g, '-');

        if (workflowName && workflowSlug) {
          workflows.push({ name: workflowName, slug: workflowSlug });
        }
      }
    });

    return workflows;
  }, [layoutName, layoutId, allWorkflows, dependencies]);

  const usageCount = workflowsUsingLayout.length;

  if (usageCount === 0) {
    return (
      <div className="relative flex items-center gap-1 p-0">
        <span className="text-label-2xs text-text-soft">Not used</span>
      </div>
    );
  }

  const UsageDisplay = () => (
    <div className="flex items-center gap-px">
      <RiRouteFill className="text-icon-sub h-3.5 w-3.5" />
      <span className="text-label-2xs text-text-soft">{usageCount}</span>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex cursor-pointer items-center gap-1 p-0">
          <span className="text-xs font-medium leading-3 text-gray-400">Used in</span>
          <UsageDisplay />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-lg border border-gray-200 bg-white p-1.5 pb-1 pt-1.5 shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="mb-1 text-xs font-medium leading-3 text-gray-400">Used in</div>
          {workflowsUsingLayout.map((workflow, index) => (
            <div key={index} className="flex min-w-[175px] items-center gap-1.5 rounded bg-gray-50 px-1 py-0.5">
              <RiRouteFill className="text-icon-sub h-3.5 w-3.5" />
              <div className="flex flex-col text-left leading-tight">
                <div className="text-xs font-medium leading-[14px] text-gray-600">{workflow.name}</div>
                <div
                  className="font-mono leading-[14px] tracking-tight text-gray-400"
                  style={{ fontSize: '8px', letterSpacing: '-0.16px' }}
                >
                  {workflow.slug}
                </div>
              </div>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
