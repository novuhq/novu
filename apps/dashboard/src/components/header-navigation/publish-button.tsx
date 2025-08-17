import type { IEnvironment } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { LuBookUp2 } from 'react-icons/lu';
import { RiArrowDownSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { IEnvironmentDiffResponse, IEnvironmentPublishResponse, ResourceToPublish } from '@/api/environments';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useDiffEnvironments, usePublishEnvironments } from '@/hooks/use-environments';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { Skeleton } from '../primitives/skeleton';
import TruncatedText from '../truncated-text';
import { NoChangesModal } from './no-changes-modal';
import { PublishModal } from './publish-modal';
import { PublishSuccessModal } from './publish-success-modal';

type ModalState = 'closed' | 'publish' | 'success' | 'no-changes';

type PublishState = {
  modalState: ModalState;
  selectedEnvironment: IEnvironment | null;
  publishResult: IEnvironmentPublishResponse | null;
};

export const PublishButton = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { state, actions } = usePublishState();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const { currentEnvironment, switchEnvironment } = useEnvironment();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });
  const publishMutation = usePublishEnvironments();

  // Filter out current environment and ensure we have valid environments
  const otherEnvironments = environments.filter((env) => env?._id && env._id !== currentEnvironment?._id);
  const isSingleEnvironment = otherEnvironments.length === 1;
  const targetEnvironment = isSingleEnvironment ? otherEnvironments[0] : null;

  // Fetch diff for single environment with proper validation
  const { data: diffData, isLoading: isDiffLoading } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironment?._id,
    targetEnvironmentId: targetEnvironment?._id,
    enabled: !!targetEnvironment?._id && !!currentEnvironment?._id,
  });

  const changesCount = calculateChangesCount(diffData);

  // Invalidate diff cache when workflows change
  useInvalidateDiffOnWorkflowChange(!!targetEnvironment);

  const handleEnvironmentSelect = useCallback(
    (environment: IEnvironment, hasChanges: boolean) => {
      if (!environment?._id) {
        console.warn('Cannot select environment: missing environment ID');
        return;
      }

      setIsDropdownOpen(false);

      // Force refetch diff data to get latest changes
      queryClient.invalidateQueries({ queryKey: ['diff-environments'] });

      if (hasChanges) {
        actions.openPublishModal(environment);
      } else {
        actions.openNoChangesModal(environment);
      }
    },
    [queryClient, actions]
  );

  // Listen for custom event from command palette
  useEffect(() => {
    const handleOpenPublishModal = (event: CustomEvent) => {
      const { targetEnvironment: eventTargetEnv } = event.detail;
      if (eventTargetEnv) {
        // Force refetch diff data to get latest changes
        queryClient.invalidateQueries({ queryKey: ['diff-environments'] });

        // Check if there are changes and open appropriate modal
        handleEnvironmentSelect(eventTargetEnv, true); // Assume there are changes for now
      }
    };

    window.addEventListener('open-publish-modal', handleOpenPublishModal as EventListener);

    return () => {
      window.removeEventListener('open-publish-modal', handleOpenPublishModal as EventListener);
    };
  }, [queryClient, handleEnvironmentSelect]);

  const handlePublish = async (selectedResources?: ResourceToPublish[]) => {
    if (!state.selectedEnvironment?._id || !currentEnvironment?._id) {
      console.warn('Cannot publish: missing required environment IDs');
      return;
    }

    try {
      const result = await publishMutation.mutateAsync({
        sourceEnvironmentId: currentEnvironment._id,
        targetEnvironmentId: state.selectedEnvironment._id,
        resources: selectedResources,
      });

      queryClient.invalidateQueries({ queryKey: ['diff-environments'] });
      actions.showSuccess(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish environment';
      showErrorToast(message, 'Publishing Failed');
    }
  };

  const handleSwitchEnvironment = () => {
    if (!state.selectedEnvironment?.slug) {
      console.warn('Cannot switch environment: missing environment slug');
      return;
    }

    switchEnvironment(state.selectedEnvironment.slug);
    navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: state.selectedEnvironment.slug }));
    actions.close();
  };

  if (isSingleEnvironment && targetEnvironment) {
    return (
      <>
        <Button
          variant="secondary"
          className="h-[26px]"
          mode="outline"
          size="2xs"
          leadingIcon={LuBookUp2}
          onClick={() => handleEnvironmentSelect(targetEnvironment, changesCount > 0)}
        >
          <div className="flex items-center">
            Publish changes
            <ChangeIndicator count={changesCount} isLoading={isDiffLoading} />
          </div>
        </Button>

        <PublishModal
          isOpen={state.modalState === 'publish'}
          onClose={actions.close}
          environment={state.selectedEnvironment!}
          currentEnvironmentId={currentEnvironment?._id}
          onConfirm={handlePublish}
          isPublishing={publishMutation.isPending}
        />

        <PublishSuccessModal
          isOpen={state.modalState === 'success'}
          onClose={actions.close}
          environment={state.selectedEnvironment!}
          publishResult={state.publishResult || undefined}
          onSwitchEnvironment={handleSwitchEnvironment}
        />

        <NoChangesModal
          isOpen={state.modalState === 'no-changes'}
          onClose={actions.close}
          targetEnvironment={state.selectedEnvironment || undefined}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="h-[26px]"
            mode="outline"
            size="2xs"
            leadingIcon={LuBookUp2}
            trailingIcon={RiArrowDownSLine}
            disabled={otherEnvironments.length === 0}
          >
            Publish changes
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[400px] min-w-[280px] overflow-y-auto">
          {otherEnvironments.length === 0 ? (
            <DropdownMenuItem disabled className="p-3">
              <div className="text-sm text-neutral-500">No other environments available</div>
            </DropdownMenuItem>
          ) : (
            otherEnvironments.map((environment) => (
              <EnvironmentOption
                key={environment._id}
                environment={environment}
                currentEnvironmentId={currentEnvironment?._id}
                onSelect={(hasChanges) => handleEnvironmentSelect(environment, hasChanges)}
                isDropdownOpen={isDropdownOpen}
              />
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      {state.selectedEnvironment && (
        <>
          <PublishModal
            isOpen={state.modalState === 'publish'}
            onClose={actions.close}
            environment={state.selectedEnvironment}
            currentEnvironmentId={currentEnvironment?._id}
            onConfirm={handlePublish}
            isPublishing={publishMutation.isPending}
          />

          <PublishSuccessModal
            isOpen={state.modalState === 'success'}
            onClose={actions.close}
            environment={state.selectedEnvironment}
            publishResult={state.publishResult || undefined}
            onSwitchEnvironment={handleSwitchEnvironment}
          />

          <NoChangesModal
            isOpen={state.modalState === 'no-changes'}
            onClose={actions.close}
            targetEnvironment={state.selectedEnvironment}
          />
        </>
      )}
    </>
  );
};

const calculateChangesCount = (diffData: IEnvironmentDiffResponse | undefined | null): number => {
  if (!diffData?.resources || !Array.isArray(diffData.resources)) {
    return 0;
  }

  return diffData.resources.length;
};

const usePublishState = () => {
  const [state, setState] = useState<PublishState>({
    modalState: 'closed',
    selectedEnvironment: null,
    publishResult: null,
  });

  const actions = {
    openPublishModal: (environment: IEnvironment) =>
      setState({ modalState: 'publish', selectedEnvironment: environment, publishResult: null }),

    openNoChangesModal: (environment: IEnvironment) =>
      setState({ modalState: 'no-changes', selectedEnvironment: environment, publishResult: null }),

    showSuccess: (result: IEnvironmentPublishResponse) =>
      setState((prev) => ({ ...prev, modalState: 'success', publishResult: result })),

    close: () => setState({ modalState: 'closed', selectedEnvironment: null, publishResult: null }),
  };

  return { state, actions };
};

const useInvalidateDiffOnWorkflowChange = (enabled: boolean = true) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey.includes(QueryKeys.fetchWorkflows)) {
        queryClient.invalidateQueries({ queryKey: ['diff-environments'] });
      }
    });

    return unsubscribe;
  }, [queryClient, enabled]);
};

type ChangeIndicatorProps = {
  /** The number of changes to display */
  count: number;
  /** Whether the diff data is currently loading */
  isLoading: boolean;
  /** Visual variant for different contexts */
  variant?: 'inline' | 'badge';
};

/**
 * Component that displays the count of changes with appropriate styling
 * Handles loading states and empty states gracefully
 */
const ChangeIndicator = ({ count, isLoading, variant = 'inline' }: ChangeIndicatorProps) => {
  // Ensure count is a valid non-negative number
  const safeCount = Math.max(0, Math.floor(count) || 0);

  if (isLoading) {
    return <Skeleton className="ml-1 h-4 w-6 rounded-full" />;
  }

  if (safeCount === 0) {
    return variant === 'badge' ? (
      <Badge variant="lighter" color="gray" size="sm">
        No changes
      </Badge>
    ) : null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={safeCount}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
        className={variant === 'inline' ? 'ml-1' : ''}
      >
        <Badge variant="lighter" color="purple" size="sm" className="text-subheading-2xs h-4 min-w-4 p-0">
          {safeCount}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
};

type EnvironmentOptionProps = {
  environment: IEnvironment;
  currentEnvironmentId?: string;
  onSelect: (hasChanges: boolean) => void;
  isDropdownOpen: boolean;
};

/**
 * Component representing a single environment option in the publish dropdown
 * Fetches and displays diff information for the environment
 */
const EnvironmentOption = ({ environment, currentEnvironmentId, onSelect, isDropdownOpen }: EnvironmentOptionProps) => {
  const { data: diffData, isLoading } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment._id,
    enabled: isDropdownOpen && !!currentEnvironmentId && !!environment._id,
  });

  const changesCount = calculateChangesCount(diffData);
  const hasChanges = changesCount > 0;

  const handleClick = () => {
    if (!isLoading && environment._id) {
      onSelect(hasChanges);
    }
  };

  if (!environment._id || !environment.name) {
    return null;
  }

  return (
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
        <ChangeIndicator count={changesCount} isLoading={isLoading} variant="badge" />
      </div>
    </DropdownMenuItem>
  );
};
