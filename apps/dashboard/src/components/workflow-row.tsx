import {
  DEFAULT_LOCALE,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  IEnvironment,
  PermissionsEnum,
  WorkflowListResponseDto,
} from '@novu/shared';
import { FilesIcon } from 'lucide-react';
import { ComponentProps, useState } from 'react';
import { CgBolt } from 'react-icons/cg';
import { FaCode } from 'react-icons/fa6';
import { LuBookUp2 } from 'react-icons/lu';
import {
  RiDeleteBin2Line,
  RiFlashlightLine,
  RiMore2Fill,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiPulseFill,
  RiRouteFill,
  RiTranslate2,
} from 'react-icons/ri';

import { Link, useNavigate } from 'react-router-dom';
import { type ExternalToast } from 'sonner';
import { PAUSE_MODAL_TITLE, PauseModalDescription } from '@/components/pause-workflow-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { TableCell, TableRow } from '@/components/primitives/table';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import TruncatedText from '@/components/truncated-text';
import { WorkflowStatus } from '@/components/workflow-status';
import { WorkflowSteps } from '@/components/workflow-steps';
import { WorkflowTags } from '@/components/workflow-tags';
import { IS_SELF_HOSTED, LEGACY_DASHBOARD_URL, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useDeleteWorkflow } from '@/hooks/use-delete-workflow';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useHasPermission } from '@/hooks/use-has-permission';
import { usePatchWorkflow } from '@/hooks/use-patch-workflow';
import { useSyncWorkflow } from '@/hooks/use-sync-workflow';
import { LocalizationResourceEnum } from '@/types/translations';
import { ResourceOriginEnum, WorkflowStatusEnum } from '@/utils/enums';
import { formatDateSimple } from '@/utils/format-date';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ConfirmationModal } from './confirmation-modal';
import { DeleteWorkflowDialog } from './delete-workflow-dialog';
import { TranslatedWorkflowIcon } from './icons/translated-workflow';
import { CompactButton } from './primitives/button-compact';
import { CopyButton } from './primitives/copy-button';
import { ToastIcon } from './primitives/sonner';
import { showToast } from './primitives/sonner-helpers';
import { TimeDisplayHoverCard } from './time-display-hover-card';

type WorkflowRowProps = {
  workflow: WorkflowListResponseDto;
};

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

type WorkflowLinkTableCellProps = ComponentProps<typeof TableCell>;

const WorkflowLinkTableCell = (props: WorkflowLinkTableCellProps) => {
  const { children, className, ...rest } = props;

  return (
    <TableCell className={cn('group-hover:bg-neutral-alpha-50 relative', className)} {...rest}>
      {children}
      <span className="sr-only">Edit workflow</span>
    </TableCell>
  );
};

export const WorkflowRow = ({ workflow }: WorkflowRowProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const { currentEnvironment } = useEnvironment();
  const { isUserLoaded } = useAuth();
  const has = useHasPermission();
  const navigate = useNavigate();
  const { safeSync, isSyncable, tooltipContent, PromoteConfirmModal } = useSyncWorkflow(workflow);

  const isNewChangeManagementEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_NEW_CHANGE_MECHANISM_ENABLED);
  const isV0Workflow = workflow.origin === ResourceOriginEnum.NOVU_CLOUD_V1;
  const isDuplicable =
    workflow.origin === ResourceOriginEnum.NOVU_CLOUD && currentEnvironment?.type === EnvironmentTypeEnum.DEV;
  const workflowLink = isV0Workflow
    ? buildRoute(`${LEGACY_DASHBOARD_URL}/workflows/edit/:workflowId`, {
        workflowId: workflow._id,
      })
    : buildRoute(ROUTES.EDIT_WORKFLOW, {
        environmentSlug: currentEnvironment?.slug ?? '',
        workflowSlug: workflow.slug,
      });
  const triggerWorkflowLink = isV0Workflow
    ? buildRoute(`${LEGACY_DASHBOARD_URL}/workflows/edit/:workflowId/test-workflow`, { workflowId: workflow._id })
    : buildRoute(ROUTES.TRIGGER_WORKFLOW, {
        environmentSlug: currentEnvironment?.slug ?? '',
        workflowSlug: workflow.slug,
      });

  const translationsUrl = buildRoute(ROUTES.TRANSLATIONS_EDIT, {
    environmentSlug: currentEnvironment?.slug ?? '',
    resourceType: LocalizationResourceEnum.WORKFLOW,
    resourceId: workflow.workflowId,
    locale: DEFAULT_LOCALE,
  });

  const { deleteWorkflow, isPending: isDeleteWorkflowPending } = useDeleteWorkflow({
    onSuccess: () => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="success" />
            <span className="text-sm">
              Deleted workflow <span className="font-bold">{workflow.name}</span>.
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
    onError: () => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="error" />
            <span className="text-sm">
              Failed to delete workflow <span className="font-bold">{workflow.name}</span>.
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
  });

  const { patchWorkflow, isPending: isPauseWorkflowPending } = usePatchWorkflow({
    onSuccess: (data) => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="success" />
            <span className="text-sm">
              {data.active ? 'Enabled' : 'Paused'} workflow <span className="font-bold">{workflow.name}</span>.
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
    onError: (_, { workflow }) => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="error" />
            <span className="text-sm">
              Failed to {workflow.active ? 'enable' : 'pause'} workflow{' '}
              <span className="font-bold">{workflow.name}</span>.
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
  });

  const onDeleteWorkflow = async () => {
    await deleteWorkflow({
      workflowSlug: workflow.slug,
    });
  };

  const onPauseWorkflow = async () => {
    await patchWorkflow({
      workflowSlug: workflow.slug,
      workflow: {
        active: workflow.status === WorkflowStatusEnum.ACTIVE ? false : true,
      },
    });
  };

  const handlePauseWorkflow = () => {
    if (workflow.status === WorkflowStatusEnum.ACTIVE) {
      setTimeout(() => setIsPauseModalOpen(true), 0);
      return;
    }

    onPauseWorkflow();
  };

  const handleRowClick = () => {
    if (isV0Workflow && IS_SELF_HOSTED) {
      return;
    }

    if (isV0Workflow) {
      document.location.href = workflowLink;
    } else {
      navigate(workflowLink);
    }
  };

  const stopPropagation = (e: React.MouseEvent) => {
    // don't propagate the click event to the row
    e.stopPropagation();
  };

  if (!isUserLoaded) {
    return null;
  }

  return (
    <>
      <TableRow
        key={workflow._id}
        className={cn('group relative isolate cursor-pointer', isV0Workflow && IS_SELF_HOSTED && 'cursor-not-allowed')}
        onClick={handleRowClick}
      >
        {isV0Workflow && IS_SELF_HOSTED && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="absolute inset-0 z-50" />
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="bottom" align="center" className="z-50">
                <div className="gap-1">
                  <span className="font-medium">This workflow is not supported in this version of the dashboard</span>
                  <a
                    href={SELF_HOSTED_UPGRADE_REDIRECT_URL + '?utm_campaign=workflow_row_migration_guide'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary ml-1 text-sm hover:underline"
                    onClick={stopPropagation}
                  >
                    view migration guide.
                  </a>
                </div>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        )}
        <WorkflowLinkTableCell className="flex items-center gap-2 font-medium">
          {workflow.origin === ResourceOriginEnum.EXTERNAL ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger>
                <FaCode className="text-warning size-4" />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <span className="font-medium">Code Workflow</span>
                  <span className="text-foreground-400 block text-xs">Managed via your codebase</span>
                  {workflow.isTranslationEnabled && (
                    <span className="text-foreground-400 block text-xs">Translations enabled</span>
                  )}
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          ) : workflow.origin === ResourceOriginEnum.NOVU_CLOUD_V1 ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger>
                <CgBolt className="text-feature size-4" />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <span className="font-medium">Legacy Workflow</span>
                  <span className="text-foreground-400 block text-xs">Opens in legacy dashboard</span>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          ) : (
            <Tooltip delayDuration={300}>
              <TooltipTrigger>
                {workflow.isTranslationEnabled ? (
                  <TranslatedWorkflowIcon className="text-feature size-4" />
                ) : (
                  <RiRouteFill className="text-feature size-4" />
                )}
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <span className="font-medium">UI Workflow</span>
                  <span className="text-foreground-400 block text-xs">Managed in Novu Dashboard</span>
                  {workflow.isTranslationEnabled && (
                    <span className="text-foreground-400 block text-xs">Translations enabled</span>
                  )}
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          )}
          <div>
            <div className="flex items-center gap-1">
              <TruncatedText className="max-w-[32ch]">{workflow.name}</TruncatedText>
            </div>
            <div className="flex items-center gap-1 transition-opacity duration-200">
              <TruncatedText className="text-foreground-400 font-code block max-w-[40ch] text-xs">
                {workflow.workflowId}
              </TruncatedText>

              <CopyButton
                className="z-10 flex size-2 p-0 px-1 opacity-0 group-hover:opacity-100"
                valueToCopy={workflow.workflowId}
                size="2xs"
              />
            </div>
          </div>
        </WorkflowLinkTableCell>
        <WorkflowLinkTableCell className="min-w-[200px]">
          <WorkflowStatus status={workflow.status} />
        </WorkflowLinkTableCell>
        <WorkflowLinkTableCell>
          <WorkflowSteps steps={workflow.stepTypeOverviews} />
        </WorkflowLinkTableCell>
        <WorkflowLinkTableCell>
          <WorkflowTags tags={workflow.tags || []} />
        </WorkflowLinkTableCell>

        <WorkflowLinkTableCell className="text-foreground-600 text-sm font-medium">
          {workflow.lastTriggeredAt ? (
            <TimeDisplayHoverCard date={new Date(workflow.lastTriggeredAt)}>
              {formatDateSimple(workflow.lastTriggeredAt)}
            </TimeDisplayHoverCard>
          ) : (
            <span className="text-foreground-400 text-sm font-normal">-</span>
          )}
        </WorkflowLinkTableCell>
        <WorkflowLinkTableCell className="text-foreground-600 text-sm font-medium">
          <TimeDisplayHoverCard date={new Date(workflow.updatedAt)}>
            {formatDateSimple(workflow.updatedAt)}
          </TimeDisplayHoverCard>
        </WorkflowLinkTableCell>

        <WorkflowLinkTableCell className="w-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <CompactButton
                icon={RiMore2Fill}
                disabled={
                  !has({ permission: PermissionsEnum.EVENT_WRITE }) &&
                  !has({ permission: PermissionsEnum.WORKFLOW_WRITE }) &&
                  currentEnvironment?.type !== EnvironmentTypeEnum.DEV &&
                  !has({ permission: PermissionsEnum.NOTIFICATION_READ })
                }
                variant="ghost"
                className="z-10 h-8 w-8 p-0"
                data-testid="workflow-actions-menu"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" onClick={stopPropagation}>
              <Protect
                condition={(has) =>
                  has({ permission: PermissionsEnum.EVENT_WRITE }) ||
                  has({ permission: PermissionsEnum.WORKFLOW_WRITE }) ||
                  currentEnvironment?.type !== EnvironmentTypeEnum.DEV ||
                  has({ permission: PermissionsEnum.NOTIFICATION_READ })
                }
              >
                <DropdownMenuGroup>
                  <Protect permission={PermissionsEnum.EVENT_WRITE}>
                    <Link to={triggerWorkflowLink} reloadDocument={isV0Workflow}>
                      <DropdownMenuItem className="cursor-pointer">
                        <RiPlayCircleLine />
                        Trigger workflow
                      </DropdownMenuItem>
                    </Link>
                  </Protect>
                  <Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
                    <SyncWorkflowMenuItem
                      currentEnvironment={currentEnvironment}
                      isSyncable={isNewChangeManagementEnabled ? false : isSyncable}
                      tooltipContent={
                        isNewChangeManagementEnabled
                          ? 'Syncing workflows is now performed in the top right corner of the navigation bar as Publish changes.'
                          : tooltipContent
                      }
                      onSync={safeSync}
                    />
                  </Protect>
                  <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
                    <Link
                      to={
                        buildRoute(ROUTES.ACTIVITY_FEED, {
                          environmentSlug: currentEnvironment?.slug ?? '',
                        }) +
                        '?' +
                        new URLSearchParams({ workflows: workflow._id }).toString()
                      }
                    >
                      <DropdownMenuItem className="cursor-pointer">
                        <RiPulseFill />
                        View activity
                      </DropdownMenuItem>
                    </Link>
                  </Protect>
                  {workflow.isTranslationEnabled && (
                    <Link to={translationsUrl}>
                      <DropdownMenuItem className="cursor-pointer">
                        <RiTranslate2 />
                        View translations
                      </DropdownMenuItem>
                    </Link>
                  )}
                  {currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
                    <Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
                      {isDuplicable ? (
                        <Link
                          to={buildRoute(ROUTES.WORKFLOWS_DUPLICATE, {
                            environmentSlug: currentEnvironment?.slug ?? '',
                            workflowId: workflow.workflowId,
                          })}
                        >
                          <DropdownMenuItem className="cursor-pointer">
                            <FilesIcon />
                            Duplicate workflow
                          </DropdownMenuItem>
                        </Link>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <DropdownMenuItem className="cursor-not-allowed opacity-60">
                              <FilesIcon />
                              Duplicate workflow
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent>
                              {workflow.origin === ResourceOriginEnum.NOVU_CLOUD_V1
                                ? 'V1 workflows cannot be duplicated using dashboard. Please visit the legacy portal.'
                                : 'External workflows cannot be duplicated using dashboard.'}
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      )}
                    </Protect>
                  )}
                </DropdownMenuGroup>
              </Protect>
              <Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className="*:cursor-pointer">
                  <DropdownMenuItem
                    onClick={handlePauseWorkflow}
                    disabled={workflow.status === WorkflowStatusEnum.ERROR}
                    data-testid={workflow.status === WorkflowStatusEnum.ACTIVE ? 'pause-workflow' : 'enable-workflow'}
                  >
                    {workflow.status === WorkflowStatusEnum.ACTIVE ? (
                      <>
                        <RiPauseCircleLine />
                        Pause workflow
                      </>
                    ) : (
                      <>
                        <RiFlashlightLine />
                        Enable workflow
                      </>
                    )}
                  </DropdownMenuItem>
                  {currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={workflow.origin === ResourceOriginEnum.EXTERNAL}
                      onClick={() => {
                        setTimeout(() => setIsDeleteModalOpen(true), 0);
                      }}
                      data-testid="delete-workflow"
                    >
                      <RiDeleteBin2Line />
                      Delete workflow
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </Protect>
            </DropdownMenuContent>
          </DropdownMenu>
        </WorkflowLinkTableCell>
      </TableRow>
      <DeleteWorkflowDialog
        workflow={workflow}
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={onDeleteWorkflow}
        isLoading={isDeleteWorkflowPending}
      />
      <ConfirmationModal
        open={isPauseModalOpen}
        onOpenChange={setIsPauseModalOpen}
        onConfirm={async () => {
          await onPauseWorkflow();
          setIsPauseModalOpen(false);
        }}
        title={PAUSE_MODAL_TITLE}
        description={<PauseModalDescription workflowName={workflow.name} />}
        confirmButtonText="Proceed"
        isLoading={isPauseWorkflowPending}
      />
      <PromoteConfirmModal />
    </>
  );
};

const SyncWorkflowMenuItem = ({
  currentEnvironment,
  isSyncable,
  tooltipContent,
  onSync,
}: {
  currentEnvironment: IEnvironment | undefined;
  isSyncable: boolean;
  tooltipContent: string | undefined;
  onSync: (targetEnvironmentId: string) => void;
}) => {
  const { currentOrganization } = useAuth();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });
  const otherEnvironments = environments.filter((env: IEnvironment) => env._id !== currentEnvironment?._id);

  if (!isSyncable) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <DropdownMenuItem disabled>
            <LuBookUp2 />
            Sync workflow
          </DropdownMenuItem>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </TooltipPortal>
      </Tooltip>
    );
  }

  if (otherEnvironments.length === 1) {
    return (
      <DropdownMenuItem onClick={() => onSync(otherEnvironments[0]._id)}>
        <LuBookUp2 />
        {`Sync to ${otherEnvironments[0].name}`}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <LuBookUp2 />
        Sync workflow
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {otherEnvironments.map((env) => (
            <DropdownMenuItem key={env._id} onClick={() => onSync(env._id)}>
              {env.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};
