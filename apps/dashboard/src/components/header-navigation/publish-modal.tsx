import { useState } from 'react';
import {
  RiAlertFill,
  RiCloseFill,
  RiRouteFill,
  RiDashboardLine,
  RiTranslate2,
  RiArrowRightSLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import { Dialog, DialogContent, DialogClose } from '../primitives/dialog';
import { Button } from '../primitives/button';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { useAuth } from '@/context/auth/hooks';

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
    return resource.targetResourceName || resource.sourceResourceName || 'Unnamed Resource';
  };

  const getResourceIdentifier = (resource: any) => {
    const name = getResourceDisplayName(resource);
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md gap-4 p-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className={`rounded-10 p-2 ${publishError ? 'bg-error-lighter' : 'bg-warning-lighter'}`}>
            {publishError ? (
              <RiErrorWarningLine className="text-error-base size-6" />
            ) : (
              <RiAlertFill className="text-warning-base size-6" />
            )}
          </div>
          <DialogClose asChild>
            <button className="opacity-70 transition-opacity hover:opacity-100" disabled={isPublishing}>
              <RiCloseFill className="size-4" />
            </button>
          </DialogClose>
        </div>

        {/* Title and Description */}
        <div className="space-y-1">
          <h2 className="text-label-sm text-text-strong">
            {publishError
              ? 'Publishing Failed'
              : isPublishing
                ? 'Publishing Changes...'
                : `Publishing ${totalChanges} Changes to ${environment?.name}`}
          </h2>
          {publishError ? (
            <p className="text-paragraph-xs text-error-base">{publishError}</p>
          ) : (
            <p className="text-paragraph-xs text-text-soft">
              {isPublishing ? (
                `Publishing ${workflowResources.length} workflows, ${layoutResources.length} layouts to ${environment?.name}...`
              ) : (
                <>
                  You're about to publish{' '}
                  <span className="text-text-sub">
                    {workflowResources.length} workflows, {layoutResources.length} layouts
                  </span>{' '}
                  to {environment?.name}. This may cause breaking behavior. Please review all changes before proceeding.
                </>
              )}
            </p>
          )}
        </div>

        {/* Changes Section - Only show if not publishing and no error */}
        {!isPublishing && !publishError && (
          <div className="bg-bg-weak border-stroke-soft-100 rounded-lg border">
            <div className="p-1">
              {/* Section Header */}
              <div className="flex items-center justify-between p-1">
                <span className="text-label-xs text-text-sub">Changes included in this publish</span>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="hover:bg-neutral-alpha-100 rounded p-0.5 transition-colors"
                >
                  <div className="flex size-4 items-center justify-center">
                    <div className="h-2.5 w-2.5 opacity-60">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>

              {/* Content */}
              {isExpanded && (
                <div className="bg-bg-white border-stroke-soft-100 rounded-md border">
                  <div className="space-y-0.5 p-0.5">
                    {[...workflowResources, ...layoutResources, ...translationResources].map((resource, index) => {
                      const IconComponent = getResourceIcon(resource.resourceType);
                      const displayName = getResourceDisplayName(resource);
                      const identifier = getResourceIdentifier(resource);

                      return (
                        <div
                          key={`${resource.resourceType}-${index}`}
                          className="border-stroke-soft-100 flex items-center gap-1 border-b p-1 last:border-b-0"
                        >
                          <div className="flex size-5 items-center justify-center">
                            <IconComponent className="size-3.5 text-neutral-600" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-label-xs text-text-strong truncate">{displayName}</div>
                            <div className="text-paragraph-2xs text-text-soft font-mono tracking-tight">
                              {identifier}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-paragraph-2xs text-text-soft font-medium">Last updated by</div>
                            <div className="flex items-center gap-1">
                              <Avatar className="size-4">
                                <AvatarImage src={currentUser?.profilePicture || undefined} />
                                <AvatarFallback className="text-[8px] font-medium">
                                  {currentUser?.firstName?.[0]}
                                  {currentUser?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-paragraph-2xs text-text-sub font-medium">
                                {currentUser?.firstName || 'User'}
                              </span>
                              <div className="size-0.5 rounded-full bg-neutral-400" />
                              <span className="text-paragraph-2xs text-text-sub font-medium">5h ago</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading indicator during publishing */}
        {isPublishing && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="size-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
              <span className="text-paragraph-sm text-text-sub">Publishing changes...</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" mode="outline" size="2xs" onClick={onClose} disabled={isPublishing}>
            {publishError ? 'Close' : 'Cancel'}
          </Button>
          {!publishError && (
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
      </DialogContent>
    </Dialog>
  );
}
