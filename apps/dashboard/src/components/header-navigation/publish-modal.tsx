import { RiAlertFill, RiArrowRightSLine, RiCheckboxCircleFill } from 'react-icons/ri';
import { Dialog, DialogContent } from '../primitives/dialog';
import { Button } from '../primitives/button';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { ResourceRow } from '../resource-row';
import type { IEnvironment } from '@novu/shared';
import type { IResourceDiffResult } from '@/api/environments';

type PublishModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment;
  currentEnvironmentId?: string;
  onConfirm: () => void;
  isPublishing?: boolean;
};

export function PublishModal({
  isOpen,
  onClose,
  environment,
  currentEnvironmentId,
  onConfirm,
  isPublishing = false,
}: PublishModalProps) {
  const { data: diffData } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment?._id,
    enabled: isOpen,
  });

  const aggregatedSummary = diffData?.resources?.reduce(
    (acc, resource) => ({
      added: acc.added + resource.summary.added,
      modified: acc.modified + resource.summary.modified,
      deleted: acc.deleted + resource.summary.deleted,
      unchanged: acc.unchanged + resource.summary.unchanged,
    }),
    { added: 0, modified: 0, deleted: 0, unchanged: 0 }
  );

  const totalChanges = aggregatedSummary
    ? aggregatedSummary.added + aggregatedSummary.modified + aggregatedSummary.deleted
    : 0;

  const workflowResources = diffData?.resources?.filter((resource) => resource.resourceType === 'workflow') || [];
  const layoutResources = diffData?.resources?.filter((resource) => resource.resourceType === 'layout') || [];
  const translationResources = diffData?.resources?.filter((resource) => resource.resourceType === 'translation') || [];

  const allResources = [...workflowResources, ...layoutResources, ...translationResources];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md gap-4 p-3">
        <PublishModalHeader totalChanges={totalChanges} />

        <PublishModalContent
          totalChanges={totalChanges}
          environment={environment}
          workflowResources={workflowResources}
          layoutResources={layoutResources}
        />

        {totalChanges > 0 && <ChangesSummary resources={allResources} />}

        {totalChanges === 0 && <NoChangesMessage />}

        <PublishModalActions
          totalChanges={totalChanges}
          isPublishing={isPublishing}
          environment={environment}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function PublishModalHeader({ totalChanges }: { totalChanges: number }) {
  const getIconAndStyle = () => {
    if (totalChanges === 0) {
      return {
        icon: RiCheckboxCircleFill,
        className: 'bg-success-lighter text-success-base',
      };
    }

    return {
      icon: RiAlertFill,
      className: 'bg-warning-lighter text-warning-base',
    };
  };

  const { icon: IconComponent, className } = getIconAndStyle();

  return (
    <div className="flex items-start justify-between">
      <div className={`rounded-10 p-2 ${className}`}>
        <IconComponent className="size-6" />
      </div>
    </div>
  );
}

function PublishModalContent({
  totalChanges,
  environment,
  workflowResources,
  layoutResources,
}: {
  totalChanges: number;
  environment: IEnvironment;
  workflowResources: IResourceDiffResult[];
  layoutResources: IResourceDiffResult[];
}) {
  const getTitle = () => {
    if (totalChanges === 0) return `No Changes to Publish to ${environment?.name}`;

    return `Publishing ${totalChanges} Changes to ${environment?.name}`;
  };

  const getDescription = () => {
    if (totalChanges === 0) {
      return (
        <p className="text-paragraph-xs text-text-soft">
          Your environments are already in sync. There are no changes to publish to {environment?.name}.
        </p>
      );
    }

    const resourceCounts = [];

    if (workflowResources.length > 0) {
      resourceCounts.push(`${workflowResources.length} workflow${workflowResources.length === 1 ? '' : 's'}`);
    }

    if (layoutResources.length > 0) {
      resourceCounts.push(`${layoutResources.length} layout${layoutResources.length === 1 ? '' : 's'}`);
    }

    return (
      <p className="text-paragraph-xs text-text-soft">
        You're about to publish <span className="text-text-sub">{resourceCounts.join(', ')}</span> to{' '}
        {environment?.name}. This may cause breaking behavior. Please review all changes before proceeding.
      </p>
    );
  };

  return (
    <div className="space-y-1">
      <h2 className="text-label-sm text-text-strong">{getTitle()}</h2>
      {getDescription()}
    </div>
  );
}

function ChangesSummary({ resources }: { resources: IResourceDiffResult[] }) {
  return (
    <div className="bg-bg-weak rounded-lg">
      <div className="p-1">
        <div className="flex items-center justify-between p-1">
          <span className="text-label-xs text-text-sub">Changes included in this publish</span>
        </div>

        <div className="bg-bg-white border-stroke-soft-100 rounded-md border">
          <div className="max-h-64 overflow-y-auto">
            <div className="space-y-0.5 p-0.5">
              {resources.map((resource, index) => (
                <ResourceRow key={`${resource.resourceType}-${index}`} resource={resource} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoChangesMessage() {
  return (
    <div className="bg-success-lighter border-success-base/20 rounded-lg border p-4 text-center">
      <RiCheckboxCircleFill className="text-success-base mx-auto mb-2 size-8" />
      <p className="text-paragraph-sm text-success-dark font-medium">Environments are in sync</p>
      <p className="text-paragraph-xs text-success-base mt-1">
        All workflows and configurations are identical between environments.
      </p>
    </div>
  );
}

function PublishModalActions({
  totalChanges,
  isPublishing,
  environment,
  onClose,
  onConfirm,
}: {
  totalChanges: number;
  isPublishing: boolean;
  environment: IEnvironment;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const getCancelButtonText = () => {
    if (totalChanges === 0) return 'Close';
    return 'Cancel';
  };

  return (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" mode="outline" size="2xs" onClick={onClose} disabled={isPublishing}>
        {getCancelButtonText()}
      </Button>

      {totalChanges > 0 && (
        <Button
          variant="primary"
          mode="gradient"
          size="2xs"
          onClick={onConfirm}
          disabled={totalChanges === 0 || isPublishing}
          isLoading={isPublishing}
        >
          Publish to {environment?.name}
        </Button>
      )}
    </div>
  );
}
