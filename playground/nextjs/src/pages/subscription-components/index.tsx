import { NovuProvider, Subscription, SubscriptionButton, SubscriptionPreferences } from '@novu/nextjs';
import { subscriptionDarkTheme } from '@novu/nextjs/themes';
import { useState } from 'react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

export default function SubscriptionComponentsPage() {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkTheme = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <>
      <Title title="Subscription Component" />
      <div className="h-[600px] w-96 flex flex-col gap-2">
        <button onClick={toggleDarkTheme}>Toggle Dark Theme</button>
        <NovuProvider {...novuConfig}>
          <Subscription
            topicKey="test1"
            preferences={[
              { workflowId: 'yolo' },
              { label: 'Test Group', filter: { tags: ['yoyo'] } },
              { label: 'Test Group', filter: { workflowIds: ['test-workflow1', 'test-workflow2', 'test-workflow3'] } },
            ]}
            appearance={{
              baseTheme: isDark ? subscriptionDarkTheme : undefined,
            }}
          >
            <SubscriptionButton
              onClick={({ subscription }) => console.log('clicked', subscription)}
              onDeleteError={() => console.log('remove error')}
              onDeleteSuccess={() => console.log('remove success')}
              onCreateError={() => console.log('create error')}
              onCreateSuccess={() => console.log('create success')}
            />
            <SubscriptionPreferences
              onClick={({ subscription }) => console.log('clicked', subscription)}
              onDeleteError={() => console.log('remove error')}
              onDeleteSuccess={() => console.log('remove success')}
              onCreateError={() => console.log('create error')}
              onCreateSuccess={() => console.log('create success')}
            />
          </Subscription>
        </NovuProvider>
      </div>
    </>
  );
}
