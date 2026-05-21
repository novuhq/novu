import { ConversationsContent } from '@/components/conversations/conversations-content';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';

export function ConnectConversationsPage() {
  return (
    <>
      <PageMeta title="Conversations" />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Conversations</h1>}>
        <ConversationsContent contentHeight="h-[calc(100vh-140px)]" />
      </DashboardLayout>
    </>
  );
}
