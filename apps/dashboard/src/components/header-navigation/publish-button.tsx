import { useState } from 'react';
import { RiGitPullRequestFill, RiArrowDownSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Button } from '../primitives/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { Skeleton } from '../primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import TruncatedText from '../truncated-text';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useDiffEnvironments, usePublishEnvironments } from '@/hooks/use-environments';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { PublishModal } from './publish-modal';
import { PublishSuccessModal } from './publish-success-modal';
import { buildRoute, ROUTES } from '@/utils/routes';
import type { IEnvironment } from '@novu/shared';
import type { IEnvironmentPublishResponse } from '@/api/environments';

type EnvironmentDiffCardProps = {
  environment: IEnvironment;
  currentEnvironmentId?: string;
  isDropdownOpen: boolean;
  onClick: () => void;
};

const EnvironmentDiffCard = ({
  environment,
  currentEnvironmentId,
  isDropdownOpen,
  onClick,
}: EnvironmentDiffCardProps) => {
  const { data: diffData, isLoading } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment._id,
    enabled: isDropdownOpen,
  });

  // Aggregate the summary from all resources
  const aggregatedSummary = diffData?.resources?.reduce(
    (acc, resource) => ({
      added: acc.added + resource.summary.added,
      modified: acc.modified + resource.summary.modified,
      deleted: acc.deleted + resource.summary.deleted,
      unchanged: acc.unchanged + resource.summary.unchanged,
    }),
    { added: 0, modified: 0, deleted: 0, unchanged: 0 }
  );

  const hasChanges =
    aggregatedSummary &&
    (aggregatedSummary.added > 0 || aggregatedSummary.modified > 0 || aggregatedSummary.deleted > 0);

  const handleClick = () => {
    if (hasChanges && !isLoading) {
      onClick();
    }
  };

  const cardContent = (
    <DropdownMenuItem
      onClick={handleClick}
      className={`cursor-pointer p-1 ${!hasChanges && !isLoading ? 'cursor-not-allowed opacity-60' : ''}`}
      disabled={!hasChanges && !isLoading}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <EnvironmentBranchIcon environment={environment} size="sm" />
          <span className="text-text-sub font-medium">
            Publish to{' '}
            <TruncatedText className="text-text-strong max-w-[20ch] font-bold" asChild>
              <b>{environment.name}</b>
            </TruncatedText>
          </span>
        </div>

        <div className="ml-auto">
          {isLoading ? (
            <Skeleton className="h-5 w-8 rounded-full" />
          ) : hasChanges ? (
            <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {aggregatedSummary.added > 0 && <span className="text-green-600">+{aggregatedSummary.added}</span>}
              {aggregatedSummary.modified > 0 && <span className="text-orange-600">{aggregatedSummary.modified}</span>}
              {aggregatedSummary.deleted > 0 && <span className="text-red-600">-{aggregatedSummary.deleted}</span>}
            </div>
          ) : (
            <div className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
              No changes
            </div>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );

  // Wrap with tooltip when there are no changes
  if (!hasChanges && !isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent>
          <p className="font-normal">
            No changes to publish to <b>{environment.name}</b>
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
};

export const PublishButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<IEnvironment | null>(null);
  const [publishResult, setPublishResult] = useState<IEnvironmentPublishResponse | null>(null);

  const { currentOrganization } = useAuth();
  const { currentEnvironment, switchEnvironment } = useEnvironment();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });
  const navigate = useNavigate();

  const publishMutation = usePublishEnvironments();

  const otherEnvironments = environments.filter((env) => env._id !== currentEnvironment?._id);

  const handlePublishToEnvironment = (environment: IEnvironment) => {
    setSelectedEnvironment(environment);
    setIsOpen(false);
    setPublishModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!selectedEnvironment || !currentEnvironment?._id) return;

    try {
      const result = await publishMutation.mutateAsync({
        sourceEnvironmentId: currentEnvironment._id,
        targetEnvironmentId: selectedEnvironment._id,
      });

      setPublishResult(result);
      setPublishModalOpen(false);
      setSuccessModalOpen(true);
    } catch (error: unknown) {
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish environment. Please try again.';
      showErrorToast(errorMessage, 'Publishing Failed');
      console.error('Publish failed:', error);
    }
  };

  const handleCloseModals = () => {
    setPublishModalOpen(false);
    setSuccessModalOpen(false);
    setSelectedEnvironment(null);
    setPublishResult(null);
    publishMutation.reset();
  };

  const handleSwitchEnvironment = () => {
    if (selectedEnvironment) {
      switchEnvironment(selectedEnvironment.slug || '');

      // Navigate to workflows page in the new environment
      navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: selectedEnvironment.slug || '' }));

      setSuccessModalOpen(false);
      setSelectedEnvironment(null);
      setPublishResult(null);
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="h-[26px]"
            mode="outline"
            size="2xs"
            leadingIcon={RiGitPullRequestFill}
            trailingIcon={RiArrowDownSLine}
            disabled={otherEnvironments.length === 0}
          >
            Publish changes
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[280px]">
          {otherEnvironments.length === 0 ? (
            <DropdownMenuItem disabled className="p-3">
              <div className="text-sm text-neutral-500">No other environments available</div>
            </DropdownMenuItem>
          ) : (
            otherEnvironments.map((environment) => (
              <EnvironmentDiffCard
                key={environment._id}
                environment={environment}
                currentEnvironmentId={currentEnvironment?._id}
                isDropdownOpen={isOpen}
                onClick={() => handlePublishToEnvironment(environment)}
              />
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedEnvironment && (
        <PublishModal
          isOpen={publishModalOpen}
          onClose={handleCloseModals}
          environment={selectedEnvironment}
          currentEnvironmentId={currentEnvironment?._id}
          onConfirm={handleConfirmPublish}
          isPublishing={publishMutation.isPending}
          publishError={publishMutation.error?.message || null}
        />
      )}

      {selectedEnvironment && (
        <PublishSuccessModal
          isOpen={successModalOpen}
          onClose={handleCloseModals}
          environment={selectedEnvironment}
          publishResult={publishResult || undefined}
          onSwitchEnvironment={handleSwitchEnvironment}
        />
      )}
    </>
  );
};
