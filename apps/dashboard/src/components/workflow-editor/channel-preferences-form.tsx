import { zodResolver } from '@hookform/resolvers/zod';
import { ChannelTypeEnum, WorkflowPreferences, WorkflowResponseDto } from '@novu/shared';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { RiArrowLeftSLine, RiCloseFill, RiInformationFill } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { SidebarContent, SidebarHeader } from '@/components/side-navigation/sidebar';
import { UserPreferencesFormSchema } from '@/components/workflow-editor/schema';
import { UpdateWorkflowFn } from '@/components/workflow-editor/workflow-provider';
import { useTelemetry } from '@/hooks/use-telemetry';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum, WorkflowOriginEnum } from '@/utils/enums';
import { capitalize } from '@/utils/string';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { PageMeta } from '../page-meta';
import { CompactButton } from '../primitives/button-compact';
import { Card, CardContent } from '../primitives/card';
import { Checkbox } from '../primitives/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../primitives/form/form';
import { Separator } from '../primitives/separator';
import { Step } from '../primitives/step';
import { Switch } from '../primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

type ConfigureWorkflowFormProps = {
  workflow: WorkflowResponseDto;
  update: UpdateWorkflowFn;
};

const CHANNEL_LABELS_LOOKUP: Record<`${ChannelTypeEnum}` | 'all', string> = {
  [ChannelTypeEnum.IN_APP]: 'In-App',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
  all: 'All',
};

const checkHasEveryChannelSameValue = (
  channels: Record<ChannelTypeEnum, { enabled: boolean }>,
  checkForEnabled: boolean
) => {
  return Object.values(channels).every((channel) => channel.enabled === checkForEnabled);
};

export const ChannelPreferencesForm = (props: ConfigureWorkflowFormProps) => {
  const { workflow, update } = props;
  const track = useTelemetry();

  const isDefaultPreferences = useMemo(() => workflow.preferences.user === null, [workflow.preferences.user]);
  const isDashboardWorkflow = useMemo(() => workflow.origin === WorkflowOriginEnum.NOVU_CLOUD, [workflow.origin]);
  const formDataToRender = useMemo(() => {
    const steps = new Set(workflow.steps.map((step) => step.type));
    const defaultPreferences = isDefaultPreferences ? workflow.preferences.default : workflow.preferences.user;
    const allChannels = defaultPreferences?.channels;
    if (!allChannels) return null;

    const allChannelsArr = Object.keys(allChannels);
    const channelsInUse = allChannelsArr.filter((channel) => steps.has(channel as StepTypeEnum));
    const channelsNotInUse = allChannelsArr.filter((channel) => !steps.has(channel as StepTypeEnum));

    return {
      channelsInUse,
      channelsNotInUse,
    };
  }, [isDefaultPreferences, workflow.preferences.default, workflow.preferences.user, workflow.steps]);

  const form = useForm<z.infer<typeof UserPreferencesFormSchema>>({
    defaultValues: {
      user: workflow.preferences.user ?? workflow.preferences.default,
    },
    resolver: zodResolver(UserPreferencesFormSchema),
    shouldFocusError: false,
  });

  const overrideForm = useForm({
    defaultValues: {
      override: isDashboardWorkflow ? true : !isDefaultPreferences,
    },
  });

  const { override } = useWatch(overrideForm);

  const updateUserPreference = (userPreferences: WorkflowPreferences | null) => {
    update({
      ...workflow,
      preferences: {
        ...workflow.preferences,
        user: userPreferences,
      },
    });

    const value = userPreferences === null ? workflow.preferences.default : userPreferences;
    form.reset({
      user: value,
    });
  };

  const handleChannelToggle = (channel: ChannelTypeEnum, value: boolean) => {
    const userPreferenceValues = form.getValues('user') as WorkflowPreferences;

    const updatedUserPreferences = {
      ...workflow.preferences.default,
      ...userPreferenceValues,
      channels: {
        ...workflow.preferences.default.channels,
        ...userPreferenceValues.channels,
        [channel]: {
          enabled: value,
        },
      },
    };

    // If all channels are same value(all true or all false), update the "all" channel value to true/false
    // Also, update the "all" channel value to true if a single channel is enabled and it's not already enabled
    const areAllChannelsSameValue = checkHasEveryChannelSameValue(updatedUserPreferences.channels, value);
    if (areAllChannelsSameValue || (value && !updatedUserPreferences.all.enabled)) {
      updatedUserPreferences.all.enabled = value;
    }

    updateUserPreference(updatedUserPreferences);
  };

  const handleAllToggle = (value: boolean) => {
    if (!formDataToRender) return;
    const currentPreference = form.getValues('user') as WorkflowPreferences;

    const channelPreferences = Object.keys(currentPreference.channels).reduce(
      (acc, curr) => {
        acc[curr as ChannelTypeEnum] = { enabled: value };
        return acc;
      },
      {} as Record<ChannelTypeEnum, { enabled: boolean }>
    );

    const updatedUserPreferences = {
      all: {
        enabled: value,
        readOnly: currentPreference.all.readOnly,
      },
      channels: {
        ...currentPreference.channels,
        ...channelPreferences,
      },
    };

    updateUserPreference(updatedUserPreferences);
  };

  const handleCriticalToggle = (value: boolean) => {
    const currentPreference = form.getValues('user') as WorkflowPreferences;
    const updatedPreference = {
      ...currentPreference,
      all: {
        ...currentPreference.all,
        readOnly: value,
      },
    };

    updateUserPreference(updatedPreference);
  };

  return (
    <>
      <PageMeta title={workflow.name} />
      <motion.div
        className={cn('relative flex h-full w-full flex-col')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.1 }}
        transition={{ duration: 0.1 }}
      >
        <SidebarHeader className="items-center border-b text-sm font-medium">
          <Link to="../" className="flex items-center">
            <CompactButton icon={RiArrowLeftSLine} variant="ghost" size="md" type="button">
              <span className="sr-only">Back</span>
            </CompactButton>
          </Link>
          <span>Channel Preferences</span>

          <Link to="../" className="ml-auto flex items-center">
            <CompactButton icon={RiCloseFill} variant="ghost" type="button">
              <span className="sr-only">Close</span>
            </CompactButton>
          </Link>
        </SidebarHeader>
        <SidebarContent size="md">
          <p className="text-xs text-neutral-400">
            Set default channel preferences for subscribers and specify which channels they can customize.
          </p>
        </SidebarContent>
        {isDashboardWorkflow ? null : (
          <SidebarContent size="md">
            {/* This doesn't needs to be a form, but using it as a form allows to re-use the formItem designs without duplicating the same styles */}
            <Form {...overrideForm}>
              <form>
                <FormField
                  control={overrideForm.control}
                  name="override"
                  render={({ field }) => (
                    <FormItem className="flex w-full items-center justify-between">
                      <FormLabel tooltip="Override preferences to use dashboard-defined preferences instead of code defaults. Disable to restore defaults.">
                        Override preferences
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              updateUserPreference(null);
                            }
                            track(TelemetryEvent.WORKFLOW_PREFERENCES_OVERRIDE_USED, {
                              new_status: checked,
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </SidebarContent>
        )}
        <Separator />
        <Form {...form}>
          <form>
            <SidebarContent size="md">
              <FormField
                control={form.control}
                name="user.all.readOnly"
                render={({ field }) => (
                  <FormItem className="my-2 flex w-full items-center justify-between">
                    <FormLabel tooltip="Critical workflows ensure essential notifications can't be unsubscribed.">
                      Mark as critical
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={handleCriticalToggle} disabled={!override} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SidebarContent>
            <div className="flex items-center justify-between gap-1.5 bg-neutral-50 px-3 py-0.5">
              <span className="text-2xs uppercase text-neutral-400">All channels</span>
              <FormField
                control={form.control}
                name="user.all.enabled"
                render={({ field }) => (
                  <FormControl className="m-1">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={handleAllToggle}
                      disabled={!override || formDataToRender?.channelsInUse.length === 0}
                    />
                  </FormControl>
                )}
              />
            </div>
            <SidebarContent size="md">
              {formDataToRender?.channelsInUse.map((channel) => {
                const Icon = STEP_TYPE_TO_ICON[channel as StepTypeEnum];
                return (
                  <motion.div
                    key={channel}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FormField
                      control={form.control}
                      name={`user.channels.${channel}.enabled`}
                      render={({ field }) => (
                        <FormItem className="mt-2 flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Step variant={STEP_TYPE_TO_COLOR[channel as StepTypeEnum]} className="size-5">
                              <Icon />
                            </Step>
                            <FormLabel>{capitalize(CHANNEL_LABELS_LOOKUP[channel as ChannelTypeEnum])}</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => handleChannelToggle(channel as ChannelTypeEnum, checked)}
                              disabled={!override}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                      key={channel}
                    />
                  </motion.div>
                );
              })}
              {formDataToRender?.channelsNotInUse.map((channel) => {
                const Icon = STEP_TYPE_TO_ICON[channel as StepTypeEnum];
                return (
                  <motion.div
                    key={channel}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FormField
                      control={form.control}
                      name={`user.channels.${channel}.enabled`}
                      render={({ field }) => (
                        <FormItem className="mt-2 flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Step variant={STEP_TYPE_TO_COLOR[channel as StepTypeEnum]} className="size-5">
                              <Icon />
                            </Step>
                            <FormLabel>{capitalize(CHANNEL_LABELS_LOOKUP[channel as ChannelTypeEnum])}</FormLabel>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <FormControl>
                                  <Switch checked={field.value} disabled />
                                </FormControl>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="w-64" align="end">
                              <span className="text-2xs">
                                Add the channel to your workflow to control its subscriber preferences.
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </FormItem>
                      )}
                      key={channel}
                    />
                  </motion.div>
                );
              })}
            </SidebarContent>
            <Separator />
          </form>
        </Form>
        {!isDashboardWorkflow && override && (
          <SidebarContent size="md">
            <Card className="bg-information/10 border-information/40 border px-2.5 py-2">
              <CardContent className="flex flex-nowrap items-center gap-2 p-0">
                <div className="size-5">
                  <RiInformationFill className="text-information m-0.5 size-4" />
                </div>
                <span className="text-2xs">
                  Preferences defined in code have been overridden. Disable overrides to restore original.
                </span>
              </CardContent>
            </Card>
          </SidebarContent>
        )}
      </motion.div>
    </>
  );
};
