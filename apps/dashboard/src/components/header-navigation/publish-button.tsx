import { useState, useEffect } from 'react';
import { RiGitPullRequestFill, RiArrowDownSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../primitives/button';
import { Badge } from '../primitives/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { Skeleton } from '../primitives/skeleton';
import TruncatedText from '../truncated-text';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useDiffEnvironments, usePublishEnvironments } from '@/hooks/use-environments';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { PublishModal } from './publish-modal';
import { PublishSuccessModal } from './publish-success-modal';
import { NoChangesModal } from './no-changes-modal';
import { buildRoute, ROUTES } from '@/utils/routes';
import { QueryKeys } from '@/utils/query-keys';
import type { IEnvironment } from '@novu/shared';
import type { IEnvironmentPublishResponse } from '@/api/environments';

type ModalState = 'closed' | 'publish' | 'success' | 'no-changes';

type PublishState = {
  modalState: ModalState;
  selectedEnvironment: IEnvironment | null;
  publishResult: IEnvironmentPublishResponse | null;
};

type ChangesSummary = {
  total: number;
  added: number;
  modified: number;
  deleted: number;
  unchanged: number;
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

  const otherEnvironments = environments.filter((env) => env._id !== currentEnvironment?._id);
  const isSingleEnvironment = otherEnvironments.length === 1;
  const targetEnvironment = isSingleEnvironment ? otherEnvironments[0] : null;

  // Fetch diff for single environment
  const { data: diffData, isLoading: isDiffLoading } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironment?._id,
    targetEnvironmentId: targetEnvironment?._id,
    enabled: !!targetEnvironment,
  });

  const changesSummary = calculateChangesSummary(diffData);

  // Invalidate diff cache when workflows change
  useInvalidateDiffOnWorkflowChange(!!targetEnvironment);

  const handleEnvironmentSelect = (environment: IEnvironment, hasChanges: boolean) => {
    setIsDropdownOpen(false);

    // Force refetch diff data to get latest changes
    queryClient.invalidateQueries({ queryKey: ['diff-environments'] });

    if (hasChanges) {
      actions.openPublishModal(environment);
    } else {
      actions.openNoChangesModal(environment);
    }
  };

  const handlePublish = async () => {
    if (!state.selectedEnvironment || !currentEnvironment?._id) return;

    try {
      const result = await publishMutation.mutateAsync({
        sourceEnvironmentId: currentEnvironment._id,
        targetEnvironmentId: state.selectedEnvironment._id,
      });

      await queryClient.invalidateQueries({ queryKey: ['diff-environments'] });
      actions.showSuccess(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish environment';
      showErrorToast(message, 'Publishing Failed');
    }
  };

  const handleSwitchEnvironment = () => {
    if (!state.selectedEnvironment) return;

    switchEnvironment(state.selectedEnvironment.slug || '');
    navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: state.selectedEnvironment.slug || '' }));
    actions.close();
  };

  // Render single environment button
  if (isSingleEnvironment && targetEnvironment) {
    return (
      <>
        <Button
          variant="secondary"
          className="h-[26px]"
          mode="outline"
          size="2xs"
          leadingIcon={RiGitPullRequestFill}
          onClick={() => handleEnvironmentSelect(targetEnvironment, changesSummary.total > 0)}
          disabled={isDiffLoading}
        >
          <div className="flex items-center">
            Publish changes
            <ChangeIndicator summary={changesSummary} isLoading={isDiffLoading} />
          </div>
        </Button>

        <PublishModal
          isOpen={state.modalState === 'publish'}
          onClose={actions.close}
          environment={state.selectedEnvironment!}
          currentEnvironmentId={currentEnvironment?._id}
          onConfirm={handlePublish}
          isPublishing={publishMutation.isPending}
          publishError={publishMutation.error?.message || null}
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
            publishError={publishMutation.error?.message || null}
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

const calculateChangesSummary = (diffData: any): ChangesSummary => {
  const initial = { added: 0, modified: 0, deleted: 0, unchanged: 0, total: 0 };

  if (!diffData?.resources) return initial;

  const summary = diffData.resources.reduce(
    (acc: any, resource: any) => ({
      added: acc.added + resource.summary.added,
      modified: acc.modified + resource.summary.modified,
      deleted: acc.deleted + resource.summary.deleted,
      unchanged: acc.unchanged + resource.summary.unchanged,
    }),
    initial
  );

  summary.total = summary.added + summary.modified + summary.deleted;

  return summary;
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
  summary: ChangesSummary | null;
  isLoading: boolean;
  variant?: 'inline' | 'badge';
};

const ChangeIndicator = ({ summary, isLoading, variant = 'inline' }: ChangeIndicatorProps) => {
  if (isLoading && !summary) {
    return <Skeleton className="ml-1 h-4 w-6 rounded-full" />;
  }

  if (!summary || summary.total === 0) {
    return variant === 'badge' ? (
      <Badge variant="lighter" color="gray" size="sm">
        No changes
      </Badge>
    ) : null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={summary.total}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
        className={variant === 'inline' ? 'ml-1' : ''}
      >
        <Badge variant="lighter" color="purple" size="sm" className="text-subheading-2xs h-4 min-w-4 p-0">
          {summary.total}
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

const EnvironmentOption = ({ environment, currentEnvironmentId, onSelect, isDropdownOpen }: EnvironmentOptionProps) => {
  const { data: diffData, isLoading } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment._id,
    enabled: isDropdownOpen,
  });

  const summary = calculateChangesSummary(diffData);
  const hasChanges = summary.total > 0;

  const handleClick = () => {
    if (!isLoading) {
      onSelect(hasChanges);
    }
  };

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
        <ChangeIndicator summary={summary} isLoading={isLoading} variant="badge" />
      </div>
    </DropdownMenuItem>
  );
};
