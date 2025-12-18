import { NovuProvider, Subscription } from '@novu/nextjs';
import { subscriptionDarkTheme } from '@novu/nextjs/themes';
import { useState } from 'react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

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
        <NovuProvider {...novuConfig}>
          <Subscription
            topicKey="test"
            identifier="test"
            preferences={[
              { workflowId: 'test-workflow3' },
              { label: 'Test Group', filter: { tags: [] } },
              { label: 'Test Group', filter: { workflowIds: ['test-workflow1', 'test-workflow2', 'test-workflow3'] } },
            ]}
            appearance={{
              baseTheme: isDark ? subscriptionDarkTheme : undefined,
            }}
          />
        </NovuProvider>
      </div>
    </>
  );
}
