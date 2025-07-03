import { useState } from 'react';
import {
  RiAlertFill,
  RiRouteFill,
  RiDashboardLine,
  RiTranslate2,
  RiArrowRightSLine,
  RiErrorWarningLine,
  RiCheckboxCircleFill,
} from 'react-icons/ri';
import { Dialog, DialogContent } from '../primitives/dialog';
import { Button } from '../primitives/button';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { useAuth } from '@/context/auth/hooks';
import { formatDateSimple } from '@/utils/format-date';

type PublishModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: any;
  currentEnvironmentId?: string;
  onConfirm: () => void;
  isPublishing?: boolean;
  publishError?: string | null;
};

export function PublishModal({
  isOpen,
  onClose,
  environment,
  currentEnvironmentId,
  onConfirm,
  isPublishing = false,
  publishError = null,
}: PublishModalProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentUser } = useAuth();

  const { data: diffData, isLoading } = useDiffEnvironments({
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
        <PublishModalHeader publishError={publishError} totalChanges={totalChanges} isPublishing={isPublishing} />

        <PublishModalContent
          publishError={publishError}
          isPublishing={isPublishing}
          totalChanges={totalChanges}
          environment={environment}
          workflowResources={workflowResources}
          layoutResources={layoutResources}
        />

        {!isPublishing && !publishError && totalChanges > 0 && (
          <ChangesSummary
            isExpanded={isExpanded}
            onToggleExpanded={() => setIsExpanded(!isExpanded)}
            resources={allResources}
            currentUser={currentUser}
          />
        )}

        {totalChanges === 0 && !isPublishing && !publishError && <NoChangesMessage />}

        {isPublishing && <PublishingIndicator />}

        <PublishModalActions
          totalChanges={totalChanges}
          publishError={publishError}
          isPublishing={isPublishing}
          environment={environment}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function PublishModalHeader({
  publishError,
  totalChanges,
  isPublishing,
}: {
  publishError?: string | null;
  totalChanges: number;
  isPublishing: boolean;
}) {
  const getIconAndStyle = () => {
    if (publishError) {
      return {
        icon: RiErrorWarningLine,
        className: 'bg-error-lighter text-error-base',
      };
    }

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
  publishError,
  isPublishing,
  totalChanges,
  environment,
  workflowResources,
  layoutResources,
}: {
  publishError?: string | null;
  isPublishing: boolean;
  totalChanges: number;
  environment: any;
  workflowResources: any[];
  layoutResources: any[];
}) {
  const getTitle = () => {
    if (publishError) return 'Publishing Failed';
    if (isPublishing) return 'Publishing Changes...';
    if (totalChanges === 0) return `No Changes to Publish to ${environment?.name}`;

    return `Publishing ${totalChanges} Changes to ${environment?.name}`;
  };

  const getDescription = () => {
    if (publishError) {
      return <p className="text-paragraph-xs text-error-base">{publishError}</p>;
    }

    if (totalChanges === 0) {
      return (
        <p className="text-paragraph-xs text-text-soft">
          Your environments are already in sync. There are no changes to publish to {environment?.name}.
        </p>
      );
    }

    if (isPublishing) {
      return (
        <p className="text-paragraph-xs text-text-soft">
          Publishing {workflowResources.length} workflows, {layoutResources.length} layouts to {environment?.name}...
        </p>
      );
    }

    return (
      <p className="text-paragraph-xs text-text-soft">
        You're about to publish{' '}
        <span className="text-text-sub">
          {workflowResources.length} workflows, {layoutResources.length} layouts
        </span>{' '}
        to {environment?.name}. This may cause breaking behavior. Please review all changes before proceeding.
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

function ChangesSummary({
  isExpanded,
  onToggleExpanded,
  resources,
  currentUser,
}: {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  resources: any[];
  currentUser: any;
}) {
  return (
    <div className="bg-bg-weak border-stroke-soft-100 rounded-lg border">
      <div className="p-1">
        <div className="flex items-center justify-between p-1">
          <span className="text-label-xs text-text-sub">Changes included in this publish</span>
          <button onClick={onToggleExpanded} className="hover:bg-neutral-alpha-100 rounded p-0.5 transition-colors">
            <div className="flex size-4 items-center justify-center">
              <div className="h-2.5 w-2.5 opacity-60">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {isExpanded && (
          <div className="bg-bg-white border-stroke-soft-100 rounded-md border">
            <div className="space-y-0.5 p-0.5">
              {resources.map((resource, index) => (
                <ResourceItem key={`${resource.resourceType}-${index}`} resource={resource} currentUser={currentUser} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceItem({ resource, currentUser }: { resource: any; currentUser: any }) {
  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'workflow':
        return RiRouteFill;
      case 'layout':
        return RiDashboardLine;
      case 'translation':
        return RiTranslate2;
      default:
        return RiRouteFill;
    }
  };

  const getResourceDisplayName = (resource: any) => {
    return resource.targetResource?.name || resource.sourceResource?.name || 'Unnamed Resource';
  };

  const getResourceIdentifier = (resource: any) => {
    const name = getResourceDisplayName(resource);
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  const getResourceUpdatedBy = (resource: any) => {
    const sourceUpdatedBy = resource.sourceResource?.updatedBy;
    const targetUpdatedBy = resource.targetResource?.updatedBy;
    return sourceUpdatedBy || targetUpdatedBy || currentUser;
  };

  const getResourceUpdatedAt = (resource: any) => {
    const sourceUpdatedAt = resource.sourceResource?.updatedAt;
    const targetUpdatedAt = resource.targetResource?.updatedAt;
    return sourceUpdatedAt || targetUpdatedAt;
  };

  const IconComponent = getResourceIcon(resource.resourceType);
  const displayName = getResourceDisplayName(resource);
  const identifier = getResourceIdentifier(resource);
  const updatedBy = getResourceUpdatedBy(resource);
  const updatedAt = getResourceUpdatedAt(resource);

  return (
    <div className="border-stroke-soft-100 flex items-center gap-1 border-b p-1 last:border-b-0">
      <div className="flex size-5 items-center justify-center">
        <IconComponent className="size-3.5 text-neutral-600" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-label-xs text-text-strong truncate">{displayName}</div>
        <div className="text-paragraph-2xs text-text-soft font-mono tracking-tight">{identifier}</div>
      </div>

      <div className="text-right">
        <div className="text-paragraph-2xs text-text-soft font-medium">
          {updatedBy?.firstName && updatedBy?.lastName ? 'Last updated by' : 'Last updated'}
        </div>
        <div className="flex items-center gap-1">
          {updatedBy?.firstName && updatedBy?.lastName && (
            <>
              <Avatar className="size-4">
                <AvatarImage src={updatedBy?.profilePicture || undefined} />
                <AvatarFallback className="text-[8px] font-medium">
                  {updatedBy?.firstName?.[0]}
                  {updatedBy?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-paragraph-2xs text-text-sub font-medium">{updatedBy?.firstName}</span>
              <div className="size-0.5 rounded-full bg-neutral-400" />
            </>
          )}
          <span className="text-paragraph-2xs text-text-sub font-medium">
            {updatedAt ? formatDateSimple(updatedAt) : 'Unknown'}
          </span>
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

function PublishingIndicator() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
        <span className="text-paragraph-sm text-text-sub">Publishing changes...</span>
      </div>
    </div>
  );
}

function PublishModalActions({
  totalChanges,
  publishError,
  isPublishing,
  environment,
  onClose,
  onConfirm,
}: {
  totalChanges: number;
  publishError?: string | null;
  isPublishing: boolean;
  environment: any;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const getCancelButtonText = () => {
    if (totalChanges === 0) return 'Close';
    if (publishError) return 'Close';
    return 'Cancel';
  };

  return (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" mode="outline" size="2xs" onClick={onClose} disabled={isPublishing}>
        {getCancelButtonText()}
      </Button>

      {!publishError && totalChanges > 0 && (
        <Button
          variant="error"
          size="2xs"
          trailingIcon={!isPublishing ? RiArrowRightSLine : undefined}
          onClick={onConfirm}
          disabled={totalChanges === 0 || isPublishing}
          isLoading={isPublishing}
        >
          {isPublishing ? 'Publishing...' : `Publish to ${environment?.name}`}
        </Button>
      )}

      {publishError && (
        <Button variant="primary" size="2xs" trailingIcon={RiArrowRightSLine} onClick={onConfirm}>
          Try Again
        </Button>
      )}
    </div>
  );
}
