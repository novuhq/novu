import { useState } from 'react';

type Tab = {
  id: string;
  label: string;
  count?: number;
};

type WorkflowRunsTabsProps = {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
};

export function WorkflowRunsTabs({ activeTab = 'workflow-runs', onTabChange }: WorkflowRunsTabsProps) {
  return (
    <div className="w-full border-t border-[#e1e4ea] bg-[#fbfbfb]">
      <div className="flex items-center px-3.5 py-2">
        <div className="flex w-full items-center gap-6">
          {/* <div className="relative">
            <button
              onClick={() => onTabChange?.('execution-detail')}
              className="flex items-center justify-center gap-1.5 text-sm font-medium leading-5 tracking-[-0.084px] text-[#525866]"
            >
              Execution detail
            </button>
          </div> */}
          <div className="relative">
            <button
              onClick={() => onTabChange?.('workflow-runs')}
              className="flex items-center justify-center gap-1.5 text-sm font-medium leading-5 tracking-[-0.084px] text-[#0e121b]"
            >
              Workflow runs
            </button>
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#dd2450]" />
          </div>
        </div>
      </div>
    </div>
  );
}
