import { useMemo } from 'react';
import { DirectionEnum, IActivity, ChannelTypeEnum } from '@novu/shared';
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiLoader4Fill,
  RiHourglassFill,
  RiSmartphoneLine,
  RiMailLine,
  RiCodeBlock,
  RiArrowDownSLine,
} from 'react-icons/ri';
import { Table, TableBody, TableCell, TableRow } from '@/components/primitives/table';
import { RequestLog } from '../../types/logs';
import { WorkflowRunsFilters } from './workflow-runs-filters';
import { useWorkflowRunsUrlState } from './hooks/use-workflow-runs-url-state';

type WorkflowRunsContentProps = {
  log: RequestLog;
};

type WorkflowRunStatus = 'in-progress' | 'success' | 'error';

// Helper functions to extract data from IActivity
function getWorkflowRunStatus(activity: IActivity): WorkflowRunStatus {
  // For now, return a mock status based on activity ID
  // In real implementation, this would be derived from activity.jobs status
  const statusMap: Record<string, WorkflowRunStatus> = {
    '1': 'in-progress',
    '2': 'success',
    '3': 'error',
    '4': 'success',
    '5': 'in-progress',
  };
  return statusMap[activity._id] || 'in-progress';
}

function getCompanyName(activity: IActivity): string {
  // For now, return a mock company name
  // In real implementation, this could be derived from subscriber data or payload
  const companyMap: Record<string, string> = {
    '1': 'pearce corp',
    '2': 'pearce corp',
    '3': 'pearce corp',
    '4': 'tech solutions',
    '5': 'retail inc',
  };
  return companyMap[activity._id] || 'unknown company';
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const mockWorkflowRuns: IActivity[] = [
  {
    _id: '1',
    _templateId: 'template-1',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _subscriberId: 'subscriber-1',
    transactionId: '657c929208be7e008a458508',
    channels: [ChannelTypeEnum.EMAIL],
    to: {
      subscriberId: 'subscriber-1',
    },
    payload: {},
    tags: [],
    createdAt: '2024-11-05T08:16:49.000Z',
    updatedAt: '2024-11-05T08:16:49.000Z',
    template: {
      _id: 'template-1',
      name: 'welcome-onboarding-email',
      triggers: [],
      origin: 'external' as any,
    },
    subscriber: {
      _id: 'subscriber-1',
      subscriberId: 'subscriber-1',
      firstName: 'John',
      lastName: 'Doe',
    },
    jobs: [],
  },
  {
    _id: '2',
    _templateId: 'template-1',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _subscriberId: 'subscriber-2',
    transactionId: '657c929208be7e008a458508',
    channels: [ChannelTypeEnum.EMAIL],
    to: {
      subscriberId: 'subscriber-2',
    },
    payload: {},
    tags: [],
    createdAt: '2024-11-05T08:16:49.000Z',
    updatedAt: '2024-11-05T08:16:49.000Z',
    template: {
      _id: 'template-1',
      name: 'welcome-onboarding-email',
      triggers: [],
      origin: 'external' as any,
    },
    subscriber: {
      _id: 'subscriber-2',
      subscriberId: 'subscriber-2',
      firstName: 'Jane',
      lastName: 'Smith',
    },
    jobs: [],
  },
  {
    _id: '3',
    _templateId: 'template-1',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _subscriberId: 'subscriber-3',
    transactionId: '657c929208be7e008a458508',
    channels: [ChannelTypeEnum.EMAIL],
    to: {
      subscriberId: 'subscriber-3',
    },
    payload: {},
    tags: [],
    createdAt: '2024-11-05T08:16:49.000Z',
    updatedAt: '2024-11-05T08:16:49.000Z',
    template: {
      _id: 'template-1',
      name: 'welcome-onboarding-email',
      triggers: [],
      origin: 'external' as any,
    },
    subscriber: {
      _id: 'subscriber-3',
      subscriberId: 'subscriber-3',
      firstName: 'Bob',
      lastName: 'Johnson',
    },
    jobs: [],
  },
  {
    _id: '4',
    _templateId: 'template-2',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _subscriberId: 'subscriber-4',
    transactionId: '657c929208be7e008a458509',
    channels: [ChannelTypeEnum.EMAIL],
    to: {
      subscriberId: 'subscriber-4',
    },
    payload: {},
    tags: [],
    createdAt: '2024-11-05T08:15:30.000Z',
    updatedAt: '2024-11-05T08:15:30.000Z',
    template: {
      _id: 'template-2',
      name: 'password-reset-notification',
      triggers: [],
      origin: 'external' as any,
    },
    subscriber: {
      _id: 'subscriber-4',
      subscriberId: 'subscriber-4',
      firstName: 'Alice',
      lastName: 'Brown',
    },
    jobs: [],
  },
  {
    _id: '5',
    _templateId: 'template-3',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _subscriberId: 'subscriber-5',
    transactionId: '657c929208be7e008a458510',
    channels: [ChannelTypeEnum.EMAIL],
    to: {
      subscriberId: 'subscriber-5',
    },
    payload: {},
    tags: [],
    createdAt: '2024-11-05T08:14:15.000Z',
    updatedAt: '2024-11-05T08:14:15.000Z',
    template: {
      _id: 'template-3',
      name: 'order-confirmation',
      triggers: [],
      origin: 'external' as any,
    },
    subscriber: {
      _id: 'subscriber-5',
      subscriberId: 'subscriber-5',
      firstName: 'Charlie',
      lastName: 'Wilson',
    },
    jobs: [],
  },
];

function StatusIcon({ status }: { status: WorkflowRunStatus }) {
  const iconClass = 'w-4 h-4 rounded-full shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]';

  switch (status) {
    case 'success':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <RiCheckboxCircleFill className="h-4 w-4 text-[#1fc16b]" />
        </div>
      );
    case 'error':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <RiErrorWarningFill className="h-4 w-4 text-[#fb3748]" />
        </div>
      );
    case 'in-progress':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <RiLoader4Fill className="h-4 w-4 animate-spin text-[#f6b51e]" />
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
            <RiHourglassFill className="h-3.5 w-3.5" style={{ color: getIconColor(status) }} />
          </div>
        </div>
      </div>

      {/* SMS Step */}
      <div className="relative mr-[-8px] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${status === 'success' ? getStepColor(status) : 'border-[#e1e4ea] bg-[#fbfbfb]'} border`}
        >
          <div className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden">
            <RiSmartphoneLine
              className="h-3.5 w-3.5"
              style={{ color: status === 'success' ? getIconColor(status) : '#e1e4ea' }}
            />
          </div>
        </div>
      </div>

      {/* Email Step */}
      <div className="relative mr-[-8px] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${status === 'success' ? getStepColor(status) : 'border-[#e1e4ea] bg-[#fbfbfb]'} border`}
        >
          <div className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden">
            <RiMailLine
              className="h-3.5 w-3.5"
              style={{ color: status === 'success' ? getIconColor(status) : '#e1e4ea' }}
            />
          </div>
        </div>
      </div>

      {/* Webhook Step */}
      <div className="relative mr-[-8px] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${status === 'success' ? getStepColor(status) : 'border-[#e1e4ea] bg-[#fbfbfb]'} border`}
        >
          <div className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden">
            <RiCodeBlock
              className="h-3.5 w-3.5"
              style={{ color: status === 'success' ? getIconColor(status) : '#e1e4ea' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowRunsContent({ log }: WorkflowRunsContentProps) {
  const { filterValues, handleFiltersChange, resetFilters, orderBy, orderDirection, toggleSort } =
    useWorkflowRunsUrlState();

  // Filter the workflow runs based on the current filters
  const filteredWorkflowRuns = useMemo(() => {
    let filtered = [...mockWorkflowRuns];

    // Apply search filter (workflow names)
    if (filterValues.search) {
      const searchTerm = filterValues.search.toLowerCase();
      filtered = filtered.filter((activity) => activity.template?.name.toLowerCase().includes(searchTerm));
    }

    // Apply status filter
    if (filterValues.status && filterValues.status.length > 0) {
      filtered = filtered.filter((activity) => filterValues.status!.includes(getWorkflowRunStatus(activity)));
    }

    // Apply company filter (keeping for backward compatibility)
    if (filterValues.company) {
      const companyTerm = filterValues.company.toLowerCase();
      filtered = filtered.filter((activity) => getCompanyName(activity).toLowerCase().includes(companyTerm));
    }

    // Apply transaction ID filter
    if (filterValues.transactionId) {
      const transactionTerm = filterValues.transactionId.toLowerCase();
      filtered = filtered.filter((activity) => activity.transactionId.toLowerCase().includes(transactionTerm));
    }

    // Apply subscriber ID filter
    if (filterValues.subscriberId) {
      const subscriberTerm = filterValues.subscriberId.toLowerCase();
      filtered = filtered.filter((activity) => activity._subscriberId.toLowerCase().includes(subscriberTerm));
    }

    // Apply channels filter
    if (filterValues.channels && filterValues.channels.length > 0) {
      filtered = filtered.filter((activity) =>
        activity.channels.some((channel) => filterValues.channels!.includes(channel))
      );
    }

    // Apply sorting
    if (orderBy) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (orderBy) {
          case 'name':
            aValue = a.template?.name || '';
            bValue = b.template?.name || '';
            break;
          case 'timestamp':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'status':
            aValue = getWorkflowRunStatus(a);
            bValue = getWorkflowRunStatus(b);
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const result = aValue.localeCompare(bValue);
          return orderDirection === DirectionEnum.ASC ? result : -result;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const result = aValue - bValue;
          return orderDirection === DirectionEnum.ASC ? result : -result;
        }

        return 0;
      });
    }

    return filtered;
  }, [filterValues, orderBy, orderDirection]);

  const areFiltersApplied =
    filterValues.search !== '' ||
    (filterValues.status && filterValues.status.length > 0) ||
    filterValues.company !== '' ||
    filterValues.transactionId !== '' ||
    filterValues.subscriberId !== '' ||
    (filterValues.channels && filterValues.channels.length > 0) ||
    (filterValues.timePeriod && filterValues.timePeriod !== '60d');

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
                        <span className="text-[#525866]">{filteredWorkflowRuns.length}</span>
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

        {/* Filters */}
        <div className="w-full">
          <WorkflowRunsFilters
            filterValues={filterValues}
            onFiltersChange={handleFiltersChange}
            onReset={resetFilters}
          />
        </div>

        <div className="w-full">
          <div className="flex w-full flex-row items-center justify-center gap-2 p-0">
            <div className="h-0 flex-1 border-t border-[#f2f5f8]"></div>
          </div>
        </div>

        {/* Table without header */}
        <div className="w-full flex-1">
          <Table containerClassname="border-x-0 border-b-0 border-t-0 rounded-none shadow-none">
            <TableBody>
              {filteredWorkflowRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={1} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[14px] font-medium text-[#525866]">
                        {areFiltersApplied ? 'No workflow runs match your filters' : 'No workflow runs found'}
                      </span>
                      {areFiltersApplied && (
                        <button onClick={resetFilters} className="text-[12px] text-[#0e121b] hover:underline">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkflowRuns.map((activity) => (
                  <TableRow key={activity._id} className="h-[50px] hover:bg-neutral-50">
                    <TableCell className="px-3 py-1.5">
                      <div className="flex w-full flex-col items-end gap-0.5">
                        {/* Top row: Status icon, workflow name, and date */}
                        <div className="w-full">
                          <div className="flex w-full flex-row items-center gap-1">
                            <StatusIcon status={getWorkflowRunStatus(activity)} />
                            <div className="flex-1">
                              <div className="text-left font-['Inter'] text-[12px] font-medium leading-[16px] text-[#0e121b]">
                                {activity.template?.name || 'Unknown Workflow'}
                              </div>
                            </div>
                            <div className="text-left font-['JetBrains_Mono'] text-[11px] font-normal leading-normal text-[#99a0ae]">
                              {formatTimestamp(activity.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Bottom row: Transaction ID + company and step indicators */}
                        <div className="w-full">
                          <div className="flex w-full flex-row items-center justify-between">
                            <div className="rounded bg-[#fbfbfb]">
                              <div className="overflow-hidden">
                                <div className="flex flex-col items-start px-1.5 py-px">
                                  <div className="text-left font-['JetBrains_Mono'] text-[10px] font-normal leading-[14px] tracking-[-0.2px] text-[#525866]">
                                    {activity.transactionId} • {getCompanyName(activity)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <StepIndicator status={getWorkflowRunStatus(activity)} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredWorkflowRuns.length > 0 && !areFiltersApplied && (
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
                          <RiArrowDownSLine className="h-5 w-5 text-[#525866]" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-0 flex-1 border-t border-[#f2f5f8]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
