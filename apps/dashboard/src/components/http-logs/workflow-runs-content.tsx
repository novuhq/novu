import { CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { RequestLog } from '../../types/logs';

type WorkflowRunsContentProps = {
  log: RequestLog;
};

type WorkflowRunStatus = 'in-progress' | 'success' | 'error';

type WorkflowRun = {
  id: string;
  name: string;
  timestamp: string;
  transactionId: string;
  company: string;
  status: WorkflowRunStatus;
};

const mockWorkflowRuns: WorkflowRun[] = [
  {
    id: '1',
    name: 'welcome-onboarding-email',
    timestamp: 'Nov 5 2024 08:16:49',
    transactionId: '657c929208be7e008a458508',
    company: 'pearce corp',
    status: 'in-progress',
  },
  {
    id: '2',
    name: 'welcome-onboarding-email',
    timestamp: 'Nov 5 2024 08:16:49',
    transactionId: '657c929208be7e008a458508',
    company: 'pearce corp',
    status: 'success',
  },
  {
    id: '3',
    name: 'welcome-onboarding-email',
    timestamp: 'Nov 5 2024 08:16:49',
    transactionId: '657c929208be7e008a458508',
    company: 'pearce corp',
    status: 'error',
  },
];

function StatusIcon({ status }: { status: WorkflowRunStatus }) {
  const iconClass = 'w-4 h-4 rounded-full shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]';

  switch (status) {
    case 'success':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <CheckCircle className="h-3 w-3 fill-current text-[#1fc16b]" />
        </div>
      );
    case 'error':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <AlertTriangle className="h-3 w-3 fill-current text-[#fb3748]" />
        </div>
      );
    case 'in-progress':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <Loader className="h-3 w-3 animate-spin text-[#f6b51e]" />
        </div>
      );
    default:
      return null;
  }
}

function StepIndicator({ status }: { status: WorkflowRunStatus }) {
  const getStepColor = (stepStatus: WorkflowRunStatus) => {
    switch (stepStatus) {
      case 'success':
        return 'bg-[#1fc1671a] border-[rgba(31,193,107,0.16)]';
      case 'error':
        return 'bg-[#fb37481a] border-[rgba(251,55,72,0.16)]';
      case 'in-progress':
        return 'bg-[#1fc1671a] border-[rgba(31,193,107,0.16)]';
      default:
        return 'bg-[#fbfbfb] border-[#e1e4ea]';
    }
  };

  const getIconColor = (stepStatus: WorkflowRunStatus) => {
    switch (stepStatus) {
      case 'success':
        return '#1fc16b';
      case 'error':
        return '#fb3748';
      case 'in-progress':
        return '#1fc16b';
      default:
        return '#e1e4ea';
    }
  };

  return (
    <div className="flex flex-row items-start py-0 pl-0 pr-2">
      {/* Trigger Step */}
      <div className="relative mr-[-8px] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${getStepColor(status)} border`}
        >
          <div className="h-3.5 w-3.5 overflow-hidden">
            <div style={{ color: getIconColor(status) }}>⏳</div>
          </div>
        </div>
      </div>

      {/* SMS Step */}
      <div className="relative mr-[-8px] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${status === 'success' ? getStepColor(status) : 'border-[#e1e4ea] bg-[#fbfbfb]'} border`}
        >
          <div className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden">
            <div className="h-3 w-2 rounded-sm border border-gray-400"></div>
          </div>
        </div>
      </div>

      {/* Email Step */}
      <div className="relative mr-[-8px] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${status === 'success' ? getStepColor(status) : 'border-[#e1e4ea] bg-[#fbfbfb]'} border`}
        >
          <div className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden">
            <div style={{ color: status === 'success' ? getIconColor(status) : '#e1e4ea' }}>✉</div>
          </div>
        </div>
      </div>

      {/* Webhook Step */}
      <div className="relative mr-[-8px] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${status === 'success' ? getStepColor(status) : 'border-[#e1e4ea] bg-[#fbfbfb]'} border`}
        >
          <div className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden">
            <div style={{ color: status === 'success' ? getIconColor(status) : '#e1e4ea' }}>⚡</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowRunsContent({ log }: WorkflowRunsContentProps) {
  return (
    <div className="w-full flex-1">
      <div className="flex w-full flex-col items-start gap-3 px-3 pb-0 pt-3">
        {/* Header */}
        <div className="w-full">
          <div className="flex w-full flex-row items-start justify-between p-0">
            <div className="flex-1">
              <div className="flex w-full flex-col items-start gap-2">
                <div className="w-full">
                  <div className="flex w-full flex-col items-start gap-0.5 text-left font-['Inter'] font-medium leading-[0]">
                    <div className="flex flex-col justify-center text-[14px] tracking-[-0.084px] text-[#525866]">
                      <p className="leading-[20px]">
                        <span className="text-[#525866]">2,413</span>
                        <span className="text-[#99a0ae]"> workflow triggers</span>
                      </p>
                    </div>
                    <div className="flex min-w-full flex-col justify-center text-[12px] text-[#99a0ae]">
                      <p className="leading-[16px]">Trigger received — workflow run queued.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-left font-['Inter'] text-[12px] font-medium leading-[16px] text-[#0e121b]">
              Workflow runs ↗
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="w-full">
          <div className="flex w-full flex-row items-center justify-center gap-2 p-0">
            <div className="h-0 flex-1 border-t border-[#f2f5f8]"></div>
          </div>
        </div>

        {/* Workflow Runs List */}
        <div className="w-full flex-1">
          <div className="flex w-full flex-col items-start">
            {mockWorkflowRuns.map((run) => (
              <div key={run.id} className="h-[50px] min-h-12 w-full">
                <div className="min-h-inherit flex w-full flex-col items-end">
                  <div className="min-h-inherit flex h-[50px] w-full flex-col items-end gap-0.5 px-0 py-1.5">
                    <div className="w-full">
                      <div className="flex w-full flex-row items-center gap-1 p-0">
                        <StatusIcon status={run.status} />
                        <div className="flex-1">
                          <div className="flex w-full flex-col items-start overflow-hidden p-0">
                            <div className="w-full text-left font-['Inter'] text-[12px] font-medium leading-[16px] text-[#0e121b]">
                              {run.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-start p-0">
                          <div className="text-left font-['JetBrains_Mono'] text-[11px] font-normal leading-normal text-[#99a0ae]">
                            {run.timestamp}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full">
                      <div className="flex w-full flex-row items-center justify-between p-0">
                        <div className="rounded bg-[#fbfbfb]">
                          <div className="overflow-hidden">
                            <div className="flex flex-col items-start px-1.5 py-px">
                              <div className="text-left font-['JetBrains_Mono'] text-[10px] font-normal leading-[14px] tracking-[-0.2px] text-[#525866]">
                                {run.transactionId} • {run.company}
                              </div>
                            </div>
                          </div>
                        </div>
                        <StepIndicator status={run.status} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Load More */}
        <div className="w-full bg-white">
          <div className="flex w-full flex-col items-start gap-2.5 px-0 py-2">
            <div className="w-full">
              <div className="flex w-full flex-row items-center justify-center p-0">
                <div className="h-0 flex-1 border-t border-[#f2f5f8]"></div>
                <div className="rounded-2xl border border-[#f2f5f8] bg-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
                  <div className="flex flex-row items-center justify-center overflow-hidden">
                    <div className="flex flex-row items-center gap-0.5 px-1.5 py-1">
                      <div className="flex flex-row items-center justify-center">
                        <div className="flex flex-row items-center justify-center px-1 py-0">
                          <div className="text-left font-['Inter'] text-[12px] font-medium leading-[16px] text-[#525866]">
                            Load more
                          </div>
                        </div>
                      </div>
                      <div className="h-5 w-5 overflow-hidden">
                        <div className="text-[#525866]">▼</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-0 flex-1 border-t border-[#f2f5f8]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
