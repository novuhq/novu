import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { PreferencesItem } from '@/components/subscribers/preferences/preferences-item';
import { PreferencesSkeleton } from '@/components/subscribers/preferences/preferences-skeleton';
import { WorkflowPreferences } from '@/components/subscribers/preferences/workflow-preferences';
import useFetchSubscriberPreferences from '@/hooks/use-fetch-subscriber-preferences';
import { usePatchSubscriberPreferences } from '@/hooks/use-patch-subscriber-preferences';
import { GetSubscriberPreferencesDto, PatchPreferenceChannelsDto } from '@novu/api/models/components';
import { ChannelTypeEnum } from '@novu/shared';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

export function Preferences({ subscriberId }: { subscriberId: string }) {
  const [currentPreferences, setCurrentPreferences] = useState<GetSubscriberPreferencesDto | null>(null);

  const { patchSubscriberPreferences } = usePatchSubscriberPreferences({
    onSuccess: (data) => {
      setCurrentPreferences(data);
      showSuccessToast('Subscriber preferences updated successfully');
    },
  });

  const { data: preferences, isFetching } = useFetchSubscriberPreferences({
    subscriberId,
    /**
     * Only fetch if there are no current preferences (at first render),
     * otherwise we'll use the PATCH response
     */
    options: { enabled: currentPreferences === null },
  });

  useEffect(() => {
    if (preferences) {
      setCurrentPreferences(preferences);
    }
  }, [preferences]);

  const { workflows, globalChannelsKeys } = useMemo(() => {
    const global = currentPreferences?.global ?? { channels: {} };
    const workflows = currentPreferences?.workflows ?? [];
    const globalChannelsKeys = Object.entries(global?.channels ?? {}) as [ChannelTypeEnum, boolean][];

    return { global, workflows, globalChannelsKeys };
  }, [currentPreferences]);

  if (isFetching) {
    return <PreferencesSkeleton />;
  }

  const handleChannelToggle = async (channels: PatchPreferenceChannelsDto, workflowId?: string) => {
    await patchSubscriberPreferences({
      subscriberId,
      preferences: { channels, workflowId },
    });
  };

  return (
    <div className="flex h-full flex-col items-stretch">
      <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2">
        <span className="text-2xs line-height uppercase text-neutral-400">Global preferences</span>
        <Tooltip>
          <TooltipTrigger className="cursor-pointer">
            <RiQuestionLine className="size-3 text-neutral-400" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">
            <p>
              Subscribers can set global channel preferences, which override individual settings, e.g., disable SMS for
              all workflows at once.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <SidebarContent size="md">
        {globalChannelsKeys.map(([channel, enabled], index) => (
          <motion.div
            key={channel}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.25,
              delay: index * 0.03,
              ease: [0.21, 1.11, 0.81, 0.99],
            }}
          >
            <PreferencesItem
              key={channel}
              channel={channel}
              enabled={enabled}
              onChange={(checked: boolean) => handleChannelToggle({ [channel]: checked })}
            />
          </motion.div>
        ))}
      </SidebarContent>

      <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2">
        <span className="text-2xs line-height uppercase text-neutral-400">Workflow specific</span>
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
        {workflows.map((wf, index) => (
          <motion.div
            key={wf.workflow.slug}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.25,
              delay: index * 0.03,
              ease: [0.21, 1.11, 0.81, 0.99],
            }}
          >
            <WorkflowPreferences key={wf.workflow.slug} workflowPreferences={wf} onToggle={handleChannelToggle} />
          </motion.div>
        ))}
      </SidebarContent>
    </div>
  );
}
