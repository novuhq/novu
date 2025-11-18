import { NovuProvider, Subscription } from '@novu/nextjs';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

export default function Home() {
  return (
    <div className="flex flex-col gap-4 justify-center items-center">
      <Title title="Subscription Component" />
      <NovuProvider {...novuConfig}>
        <Subscription
          topic="test"
          identifier="test"
          preferences={[
            { workflowId: 'test-workflow3' },
            { label: 'Test Group', filter: { tags: ['test-tag'] } },
            { label: 'Test Group', filter: { workflowIds: ['test-workflow1', 'test-workflow2', 'test-workflow3'] } },
          ]}
          appearance={{ elements: {} }}
        />
      </NovuProvider>
    </div>
  );
}
