import { ConversationsContent } from '@/components/conversations/conversations-content';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SetThingsUpSection } from '@/components/dispatch/dashboard/set-things-up-section';
import { StartFromTemplateSection } from '@/components/dispatch/dashboard/start-from-template-section';
import { useDispatchSetupSteps } from '@/components/dispatch/dashboard/use-dispatch-setup-steps';
import { PageMeta } from '@/components/page-meta';

export function DispatchDashboardPage() {
  const { isComplete, isLoading } = useDispatchSetupSteps();
  const showSetThingsUp = !isLoading && !isComplete;

  return (
    <>
      <PageMeta title="Dispatch · Dashboard" />
      <DashboardLayout>
        <div className="flex flex-col gap-2.5 p-2.5">
          {showSetThingsUp ? <SetThingsUpSection /> : null}
          <StartFromTemplateSection />
          <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
            <div className="flex items-center px-2 py-1.5">
              <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
                Recent conversations
              </span>
            </div>
            <ConversationsContent className="p-0" contentHeight="h-[calc(100vh-360px)]" />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
