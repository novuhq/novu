import { useState, useEffect } from 'react';
import { RiGitPullRequestFill, RiArrowDownSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { NoChangesModal } from './no-changes-modal';
import { buildRoute, ROUTES } from '@/utils/routes';
import { diffEnvironments, type IEnvironmentDiffResponse } from '@/api/environments';
import { QueryKeys } from '@/utils/query-keys';
import type { IEnvironment } from '@novu/shared';
import type { IEnvironmentPublishResponse } from '@/api/environments';

type EnvironmentDiffCardProps = {
  environment: IEnvironment;
  currentEnvironmentId?: string;
  isDropdownOpen: boolean;
  onClick: (hasChanges: boolean) => void;
};

// Custom hook for single environment diff with smart caching
const useSingleEnvironmentDiff = (
  sourceEnvironmentId?: string,
  targetEnvironment?: IEnvironment | null,
  enabled: boolean = true
) => {
  return useQuery<IEnvironmentDiffResponse>({
    queryKey: ['diff-environments', sourceEnvironmentId, targetEnvironment?._id],
    queryFn: () =>
      diffEnvironments({
        sourceEnvironmentId: sourceEnvironmentId!,
        targetEnvironmentId: targetEnvironment!._id,
      }),
    enabled:
      enabled && !!sourceEnvironmentId && !!targetEnvironment?._id && sourceEnvironmentId !== targetEnvironment._id,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 60 * 1000, // 5 minutes background refresh
  });
};

// Custom hook to listen for workflow changes and invalidate diff cache
const useWorkflowChangeListener = (
  queryClient: ReturnType<typeof useQueryClient>,
  currentEnvironmentId?: string,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled || !currentEnvironmentId) return;

    // Set up a listener for workflow-related query invalidations
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey.includes(QueryKeys.fetchWorkflows)) {
        // When workflows are updated, invalidate diff environment cache
        queryClient.invalidateQueries({
          queryKey: ['diff-environments'],
          exact: false,
        });
      }
    });

    return unsubscribe;
  }, [queryClient, currentEnvironmentId, enabled]);
};

// Helper function to calculate aggregated summary
const calculateAggregatedSummary = (diffData: any) => {
  return diffData?.resources?.reduce(
    (acc: any, resource: any) => ({
      added: acc.added + resource.summary.added,
      modified: acc.modified + resource.summary.modified,
      deleted: acc.deleted + resource.summary.deleted,
      unchanged: acc.unchanged + resource.summary.unchanged,
    }),
    { added: 0, modified: 0, deleted: 0, unchanged: 0 }
  );
};

// Change indicator component for single environment
type ChangeIndicatorProps = {
  aggregatedSummary: any;
  isLoading: boolean;
};

const ChangeIndicator = ({ aggregatedSummary, isLoading }: ChangeIndicatorProps) => {
  if (isLoading) {
    return <Skeleton className="h-4 w-6 rounded-full" />;
  }

  if (!aggregatedSummary) return null;

  const totalChanges = aggregatedSummary.added + aggregatedSummary.modified + aggregatedSummary.deleted;

  if (totalChanges === 0) return null;

  return <span className="text-2xs text-text-soft text-code-xs ml-1">({totalChanges})</span>;
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
  const aggregatedSummary = calculateAggregatedSummary(diffData);

  const hasChanges =
    aggregatedSummary &&
    (aggregatedSummary.added > 0 || aggregatedSummary.modified > 0 || aggregatedSummary.deleted > 0);

  const handleClick = () => {
    if (isLoading) return;

    if (hasChanges) {
      onClick(true);
    } else {
      // Handle no changes case - this could trigger a no changes modal
      // For now, we'll let the parent handle it through onClick
      onClick(false);
    }
  };

  const cardContent = (
    <DropdownMenuItem onClick={handleClick} className="cursor-pointer p-1">
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
            <span className="text-2xs text-text-soft text-code-xs">
              ({aggregatedSummary.added + aggregatedSummary.modified + aggregatedSummary.deleted})
            </span>
          ) : (
            <div className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
              No changes
            </div>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );

  return cardContent;
};

type PublishModalsProps = {
  selectedEnvironment: IEnvironment | null;
  publishModalOpen: boolean;
  successModalOpen: boolean;
  currentEnvironmentId?: string;
  publishResult: IEnvironmentPublishResponse | null;
  isPublishing: boolean;
  publishError: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onSwitchEnvironment: () => void;
};

const PublishModals = ({
  selectedEnvironment,
  publishModalOpen,
  successModalOpen,
  currentEnvironmentId,
  publishResult,
  isPublishing,
  publishError,
  onClose,
  onConfirm,
  onSwitchEnvironment,
}: PublishModalsProps) => {
  if (!selectedEnvironment) return null;

  return (
    <>
      <PublishModal
        isOpen={publishModalOpen}
        onClose={onClose}
        environment={selectedEnvironment}
        currentEnvironmentId={currentEnvironmentId}
        onConfirm={onConfirm}
        isPublishing={isPublishing}
        publishError={publishError}
      />

      <PublishSuccessModal
        isOpen={successModalOpen}
        onClose={onClose}
        environment={selectedEnvironment}
        publishResult={publishResult || undefined}
        onSwitchEnvironment={onSwitchEnvironment}
      />
    </>
  );
};

export const PublishButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [noChangesModalOpen, setNoChangesModalOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<IEnvironment | null>(null);
  const [publishResult, setPublishResult] = useState<IEnvironmentPublishResponse | null>(null);

  const { currentOrganization } = useAuth();
  const { currentEnvironment, switchEnvironment } = useEnvironment();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const publishMutation = usePublishEnvironments();

  const otherEnvironments = environments.filter((env) => env._id !== currentEnvironment?._id);
  const singleEnvironment = otherEnvironments.length === 1 ? otherEnvironments[0] : null;

  // Fetch diff data for single environment case
  const { data: singleEnvDiffData, isLoading: isSingleEnvDiffLoading } = useSingleEnvironmentDiff(
    currentEnvironment?._id,
    singleEnvironment,
    !!singleEnvironment
  );

  // Listen for workflow changes and invalidate diff cache
  useWorkflowChangeListener(queryClient, currentEnvironment?._id, !!singleEnvironment);

  const singleEnvAggregatedSummary = calculateAggregatedSummary(singleEnvDiffData);
  const hasChangesForSingleEnv =
    singleEnvAggregatedSummary &&
    (singleEnvAggregatedSummary.added > 0 ||
      singleEnvAggregatedSummary.modified > 0 ||
      singleEnvAggregatedSummary.deleted > 0);

  const handlePublishToEnvironment = (environment: IEnvironment, hasChanges: boolean = true) => {
    setSelectedEnvironment(environment);
    setIsOpen(false);

    if (hasChanges) {
      setPublishModalOpen(true);
    } else {
      setNoChangesModalOpen(true);
    }
  };

  const handleDirectPublish = () => {
    if (isSingleEnvDiffLoading) return;

    if (singleEnvironment && hasChangesForSingleEnv) {
      handlePublishToEnvironment(singleEnvironment);
    } else {
      setSelectedEnvironment(singleEnvironment);
      setNoChangesModalOpen(true);
    }
  };

  const handleConfirmPublish = async () => {
    if (!selectedEnvironment || !currentEnvironment?._id) return;

    try {
      const result = await publishMutation.mutateAsync({
        sourceEnvironmentId: currentEnvironment._id,
        targetEnvironmentId: selectedEnvironment._id,
      });

      // Invalidate diff caches after successful publish
      await queryClient.invalidateQueries({
        queryKey: ['diff-environments'],
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
    setNoChangesModalOpen(false);
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

  if (singleEnvironment) {
    const buttonContent = (
      <Button
        variant="secondary"
        className="h-[26px]"
        mode="outline"
        size="2xs"
        leadingIcon={RiGitPullRequestFill}
        onClick={handleDirectPublish}
      >
        <div className="flex items-center">
          Publish changes
          <ChangeIndicator aggregatedSummary={singleEnvAggregatedSummary} isLoading={isSingleEnvDiffLoading} />
        </div>
      </Button>
    );

    // Remove tooltip wrapping since we now show modal for no changes
    const buttonWithTooltip = buttonContent;

    return (
      <>
        {buttonWithTooltip}

        <PublishModals
          selectedEnvironment={selectedEnvironment}
          publishModalOpen={publishModalOpen}
          successModalOpen={successModalOpen}
          currentEnvironmentId={currentEnvironment?._id}
          publishResult={publishResult}
          isPublishing={publishMutation.isPending}
          publishError={publishMutation.error?.message || null}
          onClose={handleCloseModals}
          onConfirm={handleConfirmPublish}
          onSwitchEnvironment={handleSwitchEnvironment}
        />

        <NoChangesModal
          isOpen={noChangesModalOpen}
          onClose={handleCloseModals}
          targetEnvironment={selectedEnvironment || undefined}
        />
      </>
    );
  }

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
                onClick={(hasChanges) => {
                  handlePublishToEnvironment(environment, hasChanges);
                }}
              />
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PublishModals
        selectedEnvironment={selectedEnvironment}
        publishModalOpen={publishModalOpen}
        successModalOpen={successModalOpen}
        currentEnvironmentId={currentEnvironment?._id}
        publishResult={publishResult}
        isPublishing={publishMutation.isPending}
        publishError={publishMutation.error?.message || null}
        onClose={handleCloseModals}
        onConfirm={handleConfirmPublish}
        onSwitchEnvironment={handleSwitchEnvironment}
      />

      <NoChangesModal
        isOpen={noChangesModalOpen}
        onClose={handleCloseModals}
        targetEnvironment={selectedEnvironment || undefined}
      />
    </>
  );
};
