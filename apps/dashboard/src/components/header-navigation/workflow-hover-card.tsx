import { useMemo } from 'react';
import { RiAddBoxLine, RiDeleteBin2Line, RiGitCommitFill } from 'react-icons/ri';
import type { IResourceDiffResult } from '@/api/environments';
import { Badge, BadgeIcon } from '../primitives/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

type WorkflowChangeType = {
  type: 'configuration' | 'steps' | 'translations';
  label: string;
  action: 'added' | 'modified' | 'deleted';
  count: number;
};

type WorkflowHoverCardProps = {
  workflowResource: IResourceDiffResult;
  children: React.ReactNode;
};

export function WorkflowHoverCard({ workflowResource, children }: WorkflowHoverCardProps) {
  const changeTypes = useMemo(() => {
    const types: WorkflowChangeType[] = [];
    const { changes } = workflowResource;

    // Track different types of changes
    let hasWorkflowConfigChanges = false;
    let hasStepChanges = false;
    let hasTranslationChanges = false;

    // Count step changes by action
    const stepActionCounts = { added: 0, modified: 0, deleted: 0, moved: 0 };

    changes.forEach((change) => {
      if (change.resourceType === 'workflow') {
        // This is a workflow-level change
        hasWorkflowConfigChanges = true;

        // Check if it's specifically translation-related
        if (change.diffs) {
          const hasTranslationChange =
            'isTranslationEnabled' in (change.diffs.new || {}) ||
            'isTranslationEnabled' in (change.diffs.previous || {});

          if (hasTranslationChange) {
            hasTranslationChanges = true;
          }
        }
      } else if (change.resourceType === 'step') {
        // This is a step-level change
        hasStepChanges = true;

        if (change.action && change.action in stepActionCounts) {
          stepActionCounts[change.action as keyof typeof stepActionCounts]++;
        }
      } else if (change.resourceType === 'localization_group') {
        hasTranslationChanges = true;
      }
    });

    // Add change types based on what we found
    if (hasWorkflowConfigChanges) {
      types.push({
        type: 'configuration',
        label: 'Workflow configuration',
        action: 'modified',
        count: 1,
      });
    }

    if (hasStepChanges) {
      // Use the most significant action (prioritize: added > modified > deleted > moved)
      let primaryAction: 'added' | 'modified' | 'deleted' = 'modified';
      let totalStepChanges = 0;

      if (stepActionCounts.added > 0) {
        primaryAction = 'added';
        totalStepChanges = stepActionCounts.added;
      } else if (stepActionCounts.modified > 0) {
        primaryAction = 'modified';
        totalStepChanges = stepActionCounts.modified;
      } else if (stepActionCounts.deleted > 0) {
        primaryAction = 'deleted';
        totalStepChanges = stepActionCounts.deleted;
      } else {
        totalStepChanges = stepActionCounts.moved;
      }

      types.push({
        type: 'steps',
        label: 'Steps & content',
        action: primaryAction,
        count: totalStepChanges,
      });
    }

    if (hasTranslationChanges) {
      types.push({
        type: 'translations',
        label: 'Translations',
        action: 'modified',
        count: 1,
      });
    }

    return types;
  }, [workflowResource.changes]);

  const getChangeIcon = (action: 'added' | 'modified' | 'deleted') => {
    switch (action) {
      case 'added':
        return RiAddBoxLine;
      case 'modified':
        return RiGitCommitFill;
      case 'deleted':
        return RiDeleteBin2Line;
      default:
        return RiGitCommitFill;
    }
  };

  const getChangeColor = (action: 'added' | 'modified' | 'deleted') => {
    switch (action) {
      case 'added':
        return 'green' as const;
      case 'modified':
        return 'orange' as const;
      case 'deleted':
        return 'red' as const;
      default:
        return 'orange' as const;
    }
  };

  const getOverallStatus = () => {
    const { summary } = workflowResource;

    if (summary.added > 0) {
      return { action: 'added' as const, label: 'Added' };
    }

    if (summary.modified > 0) {
      return { action: 'modified' as const, label: 'Modified' };
    }

    if (summary.deleted > 0) {
      return { action: 'deleted' as const, label: 'Deleted' };
    }

    return { action: 'modified' as const, label: 'Modified' };
  };

  const overallStatus = getOverallStatus();

  if (changeTypes.length === 0) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        style={{
          filter: 'drop-shadow(0px 12px 24px rgba(14, 18, 27, 0.06)) drop-shadow(0px 1px 2px rgba(14, 18, 27, 0.03))',
        }}
      >
        <div className="flex flex-col gap-1">
          {/* Overall status badge */}
          <Badge variant="lighter" size="sm" color={getChangeColor(overallStatus.action)}>
            <BadgeIcon as={getChangeIcon(overallStatus.action)} />
            {overallStatus.label}
          </Badge>

          {/* Change type details */}
          <div className="flex flex-col gap-1.5">
            {changeTypes.map((changeType, index) => {
              const IconComponent = getChangeIcon(changeType.action);
              const color = getChangeColor(changeType.action);

              return (
                <div key={index} className="flex min-w-[175px] items-center gap-1.5 rounded p-1">
                  <div className="flex h-[15px] w-[15px] items-center justify-center">
                    <IconComponent
                      className={`h-3 w-3 ${
                        color === 'green'
                          ? 'text-success-base'
                          : color === 'orange'
                            ? 'text-warning-base'
                            : color === 'red'
                              ? 'text-error-base'
                              : 'text-warning-base'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="font-medium text-gray-600" style={{ fontSize: '10px', lineHeight: '14px' }}>
                      {changeType.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
