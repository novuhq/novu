import { NovuProvider, RulesLogic, useCreateSubscription, useSubscription } from '@novu/nextjs/hooks';
import { useCallback, useMemo } from 'react';
import Title from '@/components/Title';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { novuConfig } from '@/utils/config';

const enabledRulesLogic: RulesLogic = {
  '==': [
    {
      var: 'payload.projectUpdate',
    },
    'enabled',
  ],
};
const mutedRulesLogic: RulesLogic = {
  '==': [
    {
      var: 'payload.projectUpdate',
    },
    'muted',
  ],
};

const filters = [
  { workflowId: 'test-workflow3', label: 'An issue is added to the project', enabled: false },
  { workflowId: 'test-workflow1', label: 'A customer request is added', enabled: false },
  { workflowId: 'test-workflow2', label: 'New project update is posted', condition: enabledRulesLogic },
];

const SubscriptionHooks = ({ identifier, topicKey }: { identifier: string; topicKey: string }) => {
  const { subscription, isLoading, isFetching } = useSubscription({
    topicKey,
    identifier,
  });
  const { create: createSubscription, isCreating } = useCreateSubscription();

  const preferencesWithLabels = useMemo(() => {
    if (!subscription) {
      return filters.map((filter) => ({
        ...filter,
        preference: null,
      }));
    }

    return filters.map((filter) => {
      const preference = subscription.preferences?.find(
        (pref) => pref.workflow?.id === filter.workflowId || pref.workflow?.identifier === filter.workflowId
      );

      return {
        ...filter,
        enabled: preference?.enabled ?? false,
        condition: preference?.condition,
        preference,
      };
    });
  }, [subscription]);

  const getStatusLabel = useCallback((condition?: RulesLogic) => {
    if (condition === undefined || condition === null) {
      return 'Muted';
    }

    if (typeof condition === 'boolean') {
      return condition ? 'Enabled' : 'Muted';
    }

    const conditionStr = JSON.stringify(condition);
    const enabledStr = JSON.stringify(enabledRulesLogic);
    const mutedStr = JSON.stringify(mutedRulesLogic);

    if (conditionStr === enabledStr) {
      return 'Enabled';
    }

    if (conditionStr === mutedStr) {
      return 'Muted';
    }

    return 'Custom';
  }, []);

  const getCurrentValue = useCallback((condition?: RulesLogic): string => {
    if (condition === undefined || condition === null) {
      return JSON.stringify(mutedRulesLogic);
    }

    if (typeof condition === 'boolean') {
      return condition ? JSON.stringify(enabledRulesLogic) : JSON.stringify(mutedRulesLogic);
    }

    const conditionStr = JSON.stringify(condition);
    const enabledStr = JSON.stringify(enabledRulesLogic);
    const mutedStr = JSON.stringify(mutedRulesLogic);

    if (conditionStr === enabledStr) {
      return enabledStr;
    }

    if (conditionStr === mutedStr) {
      return mutedStr;
    }

    return conditionStr;
  }, []);

  const handleCheckboxChange = useCallback(
    async (workflowId: string, checked: boolean) => {
      if (!subscription) {
        await createSubscription({ topicKey, identifier, preferences: filters });
        return;
      }

      const preference = subscription.preferences?.find(
        (pref) => pref.workflow?.id === workflowId || pref.workflow?.identifier === workflowId
      );

      if (preference) {
        await preference.update({ value: checked });
      }
    },
    [subscription, createSubscription]
  );

  const handleDropdownChange = useCallback(
    async (workflowId: string, value: string) => {
      let rulesLogicValue: boolean | unknown;
      try {
        rulesLogicValue = JSON.parse(value);
      } catch {
        rulesLogicValue = value === JSON.stringify(true) || value === 'enabled';
      }

      if (!subscription) {
        await createSubscription({ topicKey, identifier, preferences: filters });
        return;
      }

      const preference = subscription.preferences?.find(
        (pref) => pref.workflow?.id === workflowId || pref.workflow?.identifier === workflowId
      );

      if (preference) {
        await preference.update({ value: rulesLogicValue as Parameters<typeof preference.update>[0]['value'] });
      }
    },
    [subscription, createSubscription]
  );

  const handleCreateSubscription = useCallback(async () => {
    if (!subscription) {
      await createSubscription({ topicKey, identifier, preferences: filters });
    }
  }, [subscription, createSubscription]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded"></div>
            <div className="h-5 bg-gray-200 rounded"></div>
            <div className="h-5 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm w-full max-w-md overflow-hidden">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Manage subscription</h2>
          <button
            type="button"
            className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Information"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-3 h-3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
          </button>
        </div>

        {!subscription ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">No subscription found. Click the button below to create one.</p>
            <button
              onClick={handleCreateSubscription}
              disabled={isFetching}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isFetching ? 'Creating...' : 'Create Subscription'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {preferencesWithLabels.map((item) => {
              if (item.condition) {
                const statusLabel = getStatusLabel(item.condition);
                const currentValue = getCurrentValue(item.condition);
                const conditionStr = item.condition ? JSON.stringify(item.condition) : '';
                const enabledStr = JSON.stringify(enabledRulesLogic);
                const isEnabled =
                  item.enabled ||
                  (item.condition !== undefined &&
                    item.condition !== null &&
                    (typeof item.condition === 'boolean' ? item.condition : conditionStr === enabledStr));

                return (
                  <div key={item.workflowId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={isFetching}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all outline-none ${
                          isEnabled
                            ? 'bg-white border-gray-300 text-gray-700'
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                        } ${isFetching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                      >
                        {!isEnabled && (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L7.5 7.5m-1.21-1.21L3 3m0 0l3.29 3.29M12 12l.01.01M21 21l-3.29-3.29m0 0a9.953 9.953 0 01-1.563 3.029M9.878 9.878L12 12m-2.122-2.122L7.5 7.5m4.242 4.242L12 12"></path>
                            <path d="M9.88 9.88a3 3 0 105.196 5.196"></path>
                          </svg>
                        )}
                        {isEnabled && (
                          <svg
                            className="w-4 h-4 text-gray-600"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                          </svg>
                        )}
                        <span className="text-xs font-medium">{statusLabel}</span>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuRadioGroup
                          value={currentValue}
                          onValueChange={(value) => handleDropdownChange(item.workflowId, value)}
                        >
                          <DropdownMenuRadioItem value={JSON.stringify(enabledRulesLogic)}>
                            Enabled
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value={JSON.stringify(mutedRulesLogic)}>Muted</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              }

              return (
                <div key={item.workflowId} className="flex items-center justify-between group">
                  <label
                    htmlFor={`checkbox-${item.workflowId}`}
                    className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </label>
                  <Checkbox
                    id={`checkbox-${item.workflowId}`}
                    checked={item.enabled}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      handleCheckboxChange(item.workflowId, checked === true)
                    }
                    disabled={isFetching}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <span>SUBSCRIPTIONS BY</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-400 rounded-sm flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">N</span>
            </div>
            <span className="text-gray-500 font-medium">novu</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SubscriptionComponentsPage() {
  return (
    <>
      <Title title="Subscription Hooks" />
      <div className="h-[600px] w-full flex flex-col gap-8 items-center justify-center p-4">
        <NovuProvider {...novuConfig}>
          <SubscriptionHooks identifier={`${novuConfig.subscriberId}-test-hooks-1`} topicKey="test-hooks-1" />
          <SubscriptionHooks identifier={`${novuConfig.subscriberId}-test-hooks-2`} topicKey="test-hooks-2" />
        </NovuProvider>
      </div>
    </>
  );
}
