import type { RulesLogic, SubscriptionPreference, TopicSubscription } from '@novu/nextjs';
import { NovuProvider, Subscription } from '@novu/nextjs';
import { subscriptionDarkTheme } from '@novu/nextjs/themes';
import { useState } from 'react';
import Title from '@/components/Title';
import { Switch } from '@/components/ui/switch';
import { novuConfig } from '@/utils/config';

const topicKey = 'topic_key_13';
const identifier = `${topicKey}:project_4`;

const enabledCondition: RulesLogic = {
  '==': [{ var: 'payload.status' }, 'completed'],
};

const disabledCondition: RulesLogic = {
  '!=': [{ var: 'payload.status' }, 'completed'],
};

function isEnabledCondition(pref: SubscriptionPreference): boolean {
  if (!pref.condition) return false;
  const conditionStr = JSON.stringify(pref.condition);
  const enabledStr = JSON.stringify(enabledCondition);

  return conditionStr === enabledStr;
}

function WorkflowPreferences({ isDark }: { isDark: boolean }) {
  return (
    <div>
      <h4>Workflow Preferences</h4>
      <NovuProvider {...novuConfig}>
        <Subscription
          topicKey={topicKey}
          identifier={`workflows-${identifier}`}
          preferences={[
            { workflowId: 'yolo' },
            { label: 'Test Group', filter: { tags: ['yoyo'] } },
            { label: 'Test Group', filter: { workflowIds: ['test-workflow1', 'test-workflow2', 'test-workflow3'] } },
          ]}
          appearance={{
            baseTheme: isDark ? subscriptionDarkTheme : undefined,
          }}
        />
      </NovuProvider>
    </div>
  );
}

function ConditionsPreferences({ isDark }: { isDark: boolean }) {
  const handleTogglePreference = async (pref: SubscriptionPreference, checked: boolean) => {
    try {
      const newValue = checked ? enabledCondition : disabledCondition;
      console.log('Updating preference:', pref.workflow?.name, 'to condition:', newValue);
      await pref.update({ value: newValue });
      console.log('Preference updated successfully');
    } catch (error) {
      console.error('Failed to update preference:', error);
    }
  };

  const renderPreferences = (subscription?: TopicSubscription, loading?: boolean) => {
    if (loading) {
      return <div className="p-4 text-center">Loading...</div>;
    }

    if (!subscription) {
      return <div className="p-4 text-center text-gray-500">No subscription</div>;
    }

    return (
      <div className="p-4 space-y-3">
        {(subscription.preferences ?? []).map((pref: SubscriptionPreference) => {
          const isEnabled = isEnabledCondition(pref);

          return (
            <div key={pref.workflow?.id} className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{pref.workflow?.name || 'Workflow'}</span>
                <span className="text-xs text-gray-500">
                  {isEnabled ? 'payload.status == completed' : 'payload.status != completed'}
                </span>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked: boolean) => handleTogglePreference(pref, checked)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h4>Conditions Preferences</h4>
      <NovuProvider {...novuConfig}>
        <Subscription
          topicKey={topicKey}
          identifier={`conditions-${identifier}`}
          preferences={[{ workflowId: 'yolo' }]}
          renderPreferences={renderPreferences}
          appearance={{
            baseTheme: isDark ? subscriptionDarkTheme : undefined,
          }}
        />
      </NovuProvider>
    </div>
  );
}

export default function SubscriptionPage() {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkTheme = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <>
      <Title title="Subscription Component" />
      <div className="flex flex-col gap-2 items-center">
        <button onClick={toggleDarkTheme}>Toggle Dark Theme</button>
        <WorkflowPreferences isDark={isDark} />
        <ConditionsPreferences isDark={isDark} />
      </div>
    </>
  );
}
