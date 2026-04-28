import { MAX_DESCRIPTION_LENGTH, PermissionsEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentResponse, UpdateAgentBody } from '@/api/agents';
import { getAgentDetailQueryKey, updateAgent } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { ConfirmationModal } from '@/components/confirmation-modal';
import {
  DetailsSidebar,
  DetailsSidebarCard,
  DetailsSidebarRow,
  ExpandableDetailsTextarea,
} from '@/components/details-sidebar';
import { AnimatedBadgeDot, Badge } from '@/components/primitives/badge';
import { HelpTooltipIndicator } from '@/components/primitives/help-tooltip-indicator';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { cn } from '@/utils/ui';

type AgentSidebarWidgetProps = {
  agent: AgentResponse;
};

const AGENT_NAME_MAX_LENGTH = 64;

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function formatLongDate(dateStr: string): string {
  const formatted = new Date(dateStr).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);

  return formatted;
}

function TruncatedUrl({ url }: { url: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-text-sub font-code text-label-xs block max-w-[160px] truncate tracking-tight bg-transparent p-0 text-left"
        >
          {url}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs break-all">
        {url}
      </TooltipContent>
    </Tooltip>
  );
}

type BridgeUrlSectionProps = {
  agent: AgentResponse;
  canWrite: boolean;
  isUpdatePending: boolean;
  onUpdate: (body: UpdateAgentBody) => Promise<AgentResponse>;
};

function BridgeUrlSection({ agent, canWrite, isUpdatePending, onUpdate }: BridgeUrlSectionProps) {
  const isLocalTunnelActive = Boolean(agent.devBridgeActive && agent.devBridgeUrl);
  const activeBridgeUrl = isLocalTunnelActive ? agent.devBridgeUrl : agent.bridgeUrl;

  return (
    <>
      <DetailsSidebarRow label="Bridge URL">
        {activeBridgeUrl ? (
          <div className="flex items-center gap-1">
            {isLocalTunnelActive ? (
              <Badge variant="lighter" color="orange" size="sm">
                LOCAL
              </Badge>
            ) : null}
            <TruncatedUrl url={activeBridgeUrl} />
          </div>
        ) : (
          <span className="text-text-soft text-label-xs italic">Not configured</span>
        )}
      </DetailsSidebarRow>
      {agent.devBridgeUrl ? (
        <DetailsSidebarRow
          label={
            <>
              Local tunnel connection
              <HelpTooltipIndicator
                size="3"
                text="When enabled, the agent forwards traffic to your local tunnel URL instead of the deployed agent endpoint. Use this to test changes locally without redeploying."
              />
            </>
          }
        >
          <Switch
            checked={agent.devBridgeActive ?? false}
            disabled={!canWrite || isUpdatePending}
            onCheckedChange={(checked) => {
              void onUpdate({ devBridgeActive: checked });
            }}
          />
        </DetailsSidebarRow>
      ) : null}
    </>
  );
}

export function AgentSidebarWidget({ agent }: AgentSidebarWidgetProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const canWrite = has({ permission: PermissionsEnum.AGENT_WRITE });

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(agent.name);
  const nameBeforeEditRef = useRef(agent.name);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [description, setDescription] = useState(agent.description ?? '');

  const { isPending: isUpdatePending, mutateAsync: updateAgentAsync } = useMutation({
    mutationFn: (body: UpdateAgentBody) =>
      updateAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agent.identifier),
      });

      showSuccessToast('Your changes were saved.', 'Agent updated');
    },
    onError: (err: Error, variables: UpdateAgentBody) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not save changes.';

      showErrorToast(message, 'Update failed');

      if (variables.description !== undefined) {
        setDescription(agent.description ?? '');
      }

      if (variables.name !== undefined) {
        setName(agent.name);
      }
    },
  });

  const persistDescription = useCallback(async () => {
    const trimmed = description.trim();
    const server = (agent.description ?? '').trim();

    if (trimmed === server) {
      return;
    }

    if (!canWrite) {
      return;
    }

    await updateAgentAsync({ description: trimmed });
  }, [agent.description, canWrite, description, updateAgentAsync]);

  const persistName = useCallback(async () => {
    const trimmed = name.trim();
    const server = agent.name.trim();

    if (trimmed === server) {
      return;
    }

    if (!canWrite) {
      return;
    }

    await updateAgentAsync({ name: trimmed });
  }, [agent.name, canWrite, name, updateAgentAsync]);

  useEffect(() => {
    if (isDescriptionExpanded) {
      return;
    }

    setDescription(agent.description ?? '');
  }, [agent.description, isDescriptionExpanded]);

  useEffect(() => {
    if (isEditingName) {
      return;
    }

    setName(agent.name);
  }, [agent.name, isEditingName]);

  return (
    <DetailsSidebar>
      <DetailsSidebarCard>
        <DetailsSidebarRow label="Status">
          {agent.active ? (
            <Badge variant="lighter" color="green" size="md">
              <AnimatedBadgeDot color="green" />
              Active
            </Badge>
          ) : (
            <Badge variant="lighter" color="red" size="md">
              <AnimatedBadgeDot color="red" />
              Inactive
            </Badge>
          )}
          <Switch
            checked={agent.active}
            disabled={!canWrite || isUpdatePending}
            onCheckedChange={(checked) => {
              if (!checked) {
                setIsDeactivateModalOpen(true);
              } else {
                void updateAgentAsync({ active: true });
              }
            }}
          />
        </DetailsSidebarRow>

        <div className="flex h-8 items-center justify-between gap-2 px-1.5">
          <span className="text-text-soft text-label-xs font-medium shrink-0">Name</span>
          <div className="relative flex h-8 min-w-0 flex-1 items-center justify-end">
            <AnimatePresence mode="wait">
              {isEditingName && canWrite ? (
                <motion.div
                  key="name-input"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute inset-0 flex items-center"
                >
                  <Input
                    placeholder="Agent name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={AGENT_NAME_MAX_LENGTH}
                    className="w-full text-right whitespace-nowrap overflow-x-hidden mask-none"
                    size="xs"
                    autoFocus
                    disabled={isUpdatePending}
                    onBlur={() => {
                      if (!name.trim()) {
                        setName(nameBeforeEditRef.current);
                        setIsEditingName(false);

                        return;
                      }

                      setIsEditingName(false);
                      void persistName();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (name.trim()) {
                          e.currentTarget.blur();
                        } else {
                          setName(nameBeforeEditRef.current);
                          setIsEditingName(false);
                        }
                      }

                      if (e.key === 'Escape') {
                        setName(agent.name);
                        setIsEditingName(false);
                      }
                    }}
                  />
                </motion.div>
              ) : (
                <motion.button
                  key="name-display"
                  type="button"
                  onClick={() => {
                    if (!canWrite) {
                      return;
                    }

                    const current = name.trim();

                    nameBeforeEditRef.current = current ? name : agent.name;
                    setIsEditingName(true);
                  }}
                  disabled={!canWrite}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  whileHover={canWrite ? { x: 2 } : {}}
                  whileTap={canWrite ? { scale: 0.98 } : {}}
                  className={cn(
                    'text-text-sub flex h-8 min-w-0 w-full items-center justify-end text-right text-label-xs font-medium transition-colors',
                    canWrite && 'hover:text-text-strong cursor-pointer',
                    !canWrite && 'cursor-default'
                  )}
                >
                  <span className="block w-full min-w-0 truncate text-right">{name || 'Untitled agent'}</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <DetailsSidebarRow label="Agent ID">
          <span className="text-text-sub font-code text-label-xs tracking-tight">{agent.identifier}</span>
        </DetailsSidebarRow>

        <DetailsSidebarRow label="Created on">
          <TimeDisplayHoverCard date={agent.createdAt}>
            <span className="text-text-sub font-code text-label-xs tracking-tight">
              {formatLongDate(agent.createdAt)}
            </span>
          </TimeDisplayHoverCard>
        </DetailsSidebarRow>

        <BridgeUrlSection
          agent={agent}
          canWrite={canWrite}
          isUpdatePending={isUpdatePending}
          onUpdate={updateAgentAsync}
        />

        <ExpandableDetailsTextarea
          label="Description"
          value={description}
          onChange={setDescription}
          onPersist={persistDescription}
          onBeforeExpand={() => setDescription(agent.description ?? '')}
          onExpandedChange={setIsDescriptionExpanded}
          placeholder="Describe what this agent does"
          maxLength={MAX_DESCRIPTION_LENGTH}
          showCounter
          disabled={!canWrite || isUpdatePending}
          isPersisting={isUpdatePending}
        />
      </DetailsSidebarCard>

      <p className="text-label-xs font-medium">
        <span className="text-text-soft">Last updated </span>
        <span className="text-text-sub">{formatDistanceToNow(new Date(agent.updatedAt), { addSuffix: true })}</span>
      </p>

      <ConfirmationModal
        open={isDeactivateModalOpen}
        onOpenChange={setIsDeactivateModalOpen}
        onConfirm={() => {
          void updateAgentAsync({ active: false }).finally(() => setIsDeactivateModalOpen(false));
        }}
        title="Deactivate agent?"
        description={
          <>
            Deactivating <span className="font-semibold">{agent.name}</span> will immediately stop it from processing
            new inbound messages. The agent can be reactivated at any time.
          </>
        }
        confirmButtonText="Deactivate"
        isLoading={isUpdatePending}
        confirmButtonVariant="error"
      />
    </DetailsSidebar>
  );
}
