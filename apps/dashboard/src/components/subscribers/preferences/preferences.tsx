import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { PreferencesItem } from '@/components/subscribers/preferences/preferences-item';
import { WorkflowPreferences } from '@/components/subscribers/preferences/workflow-preferences';
import { usePatchSubscriberPreferences } from '@/hooks/use-patch-subscriber-preferences';
import { useTelemetry } from '@/hooks/use-telemetry';
import { itemVariants, sectionVariants } from '@/utils/animation';
import { TelemetryEvent } from '@/utils/telemetry';
import { GetSubscriberPreferencesDto, PatchPreferenceChannelsDto } from '@novu/api/models/components';
import { ChannelTypeEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

type PreferencesProps = {
  subscriberPreferences: GetSubscriberPreferencesDto;
  subscriberId: string;
  readOnly?: boolean;
};

export const Preferences = (props: PreferencesProps) => {
  const { subscriberPreferences, subscriberId, readOnly = false } = props;
  const track = useTelemetry();

  const { patchSubscriberPreferences } = usePatchSubscriberPreferences({
    onSuccess: () => {
      showSuccessToast('Subscriber preferences updated successfully');
      track(TelemetryEvent.SUBSCRIBER_PREFERENCES_UPDATED);
    },
  });

  const { workflows, globalChannelsKeys } = useMemo(() => {
    const global = subscriberPreferences?.global ?? { channels: {} };
    const workflows = subscriberPreferences?.workflows ?? [];
    const globalChannelsKeys = Object.entries(global?.channels ?? {}) as [ChannelTypeEnum, boolean][];

    return { global, workflows, globalChannelsKeys };
  }, [subscriberPreferences]);

  const handleChannelToggle = async (channels: PatchPreferenceChannelsDto, workflowId?: string) => {
    await patchSubscriberPreferences({
      subscriberId,
      preferences: { channels, workflowId },
    });
  };

  return (
    <motion.div
      className="flex h-full flex-col items-stretch"
      initial="hidden"
      animate="visible"
      variants={{ ...sectionVariants }}
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2">
          <span className="text-2xs line-height uppercase text-neutral-400">Global preferences</span>
          <Tooltip>
            <TooltipTrigger className="cursor-pointer">
              <RiQuestionLine className="size-3 text-neutral-400" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <p>
                Subscribers can set global channel preferences, which override individual settings, e.g., disable SMS
                for all workflows at once.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <SidebarContent size="md">
          {globalChannelsKeys.map(([channel, enabled]) => (
            <PreferencesItem
              key={channel}
              channel={channel}
              readOnly={readOnly}
              enabled={enabled}
              onChange={(checked: boolean) => handleChannelToggle({ [channel]: checked })}
            />
          ))}
        </SidebarContent>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2">
          <span className="text-2xs line-height uppercase text-neutral-400">Workflow Preferences</span>
          <Tooltip>
            <TooltipTrigger className="cursor-pointer">
              <RiQuestionLine className="size-3 text-neutral-400" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <p>
                This section displays all workflows and their preferences for the subscriber. The list may be further
                filtered using workflow tags or preference filters.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <SidebarContent size="md">
          {workflows.map((wf) => (
            <WorkflowPreferences
              key={wf.workflow.slug}
              workflowPreferences={wf}
              onToggle={handleChannelToggle}
              readOnly={readOnly}
            />
          ))}
        </SidebarContent>
      </motion.div>
    </motion.div>
  );
};
