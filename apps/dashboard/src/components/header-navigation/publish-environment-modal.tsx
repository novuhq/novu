import { Button } from '../primitives/button';
import { Dialog, DialogContent } from '../primitives/dialog';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { TreeView, TreeDataItem } from '../tree-view';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiRouteFill,
  RiListView,
  RiPencilRuler2Line,
  RiSettings3Line,
  RiTranslate2,
  RiLayout5Line,
  RiDashboardLine,
  RiAlertFill,
  RiExpandUpDownLine,
} from 'react-icons/ri';

type PublishEnvironmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment: any;
  currentEnvironment: any;
  onConfirm: () => void;
  isLoading?: boolean;
};

type ChangeItem = {
  type: 'added' | 'modified' | 'removed';
  description: string;
};

type WorkflowSection = {
  id: string;
  name: string;
  icon: React.ReactNode;
  added: number;
  removed: number;
  changes: ChangeItem[];
};

const PublishWorkflowCard = () => {
  const sections: WorkflowSection[] = [
    {
      id: 'payload-schema',
      name: 'Payload schema',
      icon: <RiListView className="text-text-strong size-3.5" />,
      added: 7,
      removed: 2,
      changes: [],
    },
    {
      id: 'steps',
      name: 'Steps',
      icon: <RiPencilRuler2Line className="text-text-strong size-3.5" />,
      added: 12,
      removed: 21,
      changes: [],
    },
    {
      id: 'channel-preferences',
      name: 'Channel preferences',
      icon: <RiSettings3Line className="text-text-strong size-3.5" />,
      added: 1,
      removed: 0,
      changes: [],
    },
    {
      id: 'translations',
      name: 'Translations',
      icon: <RiTranslate2 className="text-text-strong size-3.5" />,
      added: 1,
      removed: 1,
      changes: [],
    },
  ];

  const changes: ChangeItem[] = [
    { type: 'added', description: 'Email step added' },
    { type: 'modified', description: 'Inapp step content changed' },
    { type: 'modified', description: 'Delay: 2h → 30m' },
    { type: 'modified', description: 'Layout: Transactional layout' },
    { type: 'removed', description: 'Email step: step conditions step removed' },
  ];

  const renderDiffBars = (added: number, removed: number) => {
    const total = added + removed;
    const maxBars = 5;
    const addedBars = Math.round((added / total) * maxBars);
    const removedBars = maxBars - addedBars;

    return (
      <div className="flex h-2.5 items-center gap-px">
        {Array.from({ length: addedBars }).map((_, i) => (
          <div key={`added-${i}`} className="bg-success-base/40 h-full w-[3px]" />
        ))}
        {Array.from({ length: removedBars }).map((_, i) => (
          <div key={`removed-${i}`} className="bg-error-base/40 h-full w-[3px]" />
        ))}
      </div>
    );
  };

  return (
    <div className="border-stroke-soft flex flex-col gap-3 rounded-xl border bg-white p-3">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <RiRouteFill className="text-text-strong size-4" />
            <span className="text-label-sm text-text-strong font-medium">Password reset workflow</span>
            <div className="bg-warning-lighter flex items-center gap-0.5 rounded-full px-1 py-0.5 pr-1.5">
              <RiAlertFill className="text-warning-base size-3" />
              <span className="text-label-2xs text-warning-base font-medium">Breaking</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-2.5">
                <div className="bg-black/41 size-6 overflow-hidden rounded-[18px]">
                  <div className="size-6 bg-gradient-to-br from-purple-400 to-pink-400" />
                </div>
              </div>
              <span className="text-paragraph-xs text-text-sub font-medium">Naveen</span>
              <div className="bg-bg-weak border-stroke-soft rounded border px-1.5 py-[0.25px] pb-[1.04px]">
                <span className="text-text-sub text-[10px] font-medium leading-[14px]">You</span>
              </div>
            </div>
            <div className="bg-text-sub size-0.5 rounded-full" />
            <span className="text-paragraph-xs text-text-sub font-medium">5 hours ago</span>
            <div className="bg-text-sub size-0.5 rounded-full" />
            <div className="flex items-center gap-0.5">
              <span className="text-paragraph-xs font-medium">
                <span className="text-success-base">+12</span>
                <span className="text-error-base"> -21</span>
              </span>
              {renderDiffBars(12, 21)}
            </div>
          </div>
        </div>
      </div>

      {/* Changes Grid */}
      <div className="flex gap-1.5">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="bg-bg-weak flex items-center gap-1.5 rounded p-1">
            <div className="bg-success-lighter flex size-[15px] items-center justify-center rounded-sm">
              <span className="text-success-base font-mono text-[11px]">+</span>
            </div>
            <span className="text-text-sub font-mono text-[11px]">Email step added</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="bg-bg-weak flex items-center gap-1.5 rounded p-1">
            <div className="bg-warning-lighter flex size-[15px] items-center justify-center rounded-sm">
              <span className="text-warning-base text-[11px]">~</span>
            </div>
            <span className="text-text-sub font-mono text-[11px]">Inapp step content changed</span>
          </div>
          <div className="bg-bg-weak flex items-center gap-1.5 rounded p-1">
            <div className="bg-warning-lighter flex size-[15px] items-center justify-center rounded-sm">
              <span className="text-warning-base text-[11px]">~</span>
            </div>
            <span className="text-text-sub font-mono text-[11px]">
              Delay: <span className="text-text-strong">2h</span> → <span className="text-text-strong">30m</span>
            </span>
          </div>
          <div className="bg-bg-weak flex items-center gap-1.5 rounded p-1">
            <div className="bg-warning-lighter flex size-[15px] items-center justify-center rounded-sm">
              <span className="text-warning-base text-[11px]">~</span>
            </div>
            <span className="text-text-sub font-mono text-[11px]">Layout: Transactional layout</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="bg-bg-weak flex items-center gap-1.5 rounded p-1">
            <div className="bg-error-lighter flex size-[15px] items-center justify-center rounded-sm">
              <span className="text-error-base font-mono text-[11px]">-</span>
            </div>
            <span className="text-text-sub font-mono text-[11px]">Email step: step conditions step removed</span>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="bg-stroke-soft h-px" />

      {/* Sections */}
      <div className="flex flex-col gap-2">
        {sections.map((section) => (
          <div key={section.id} className="bg-bg-weak border-stroke-soft rounded-lg border">
            <div className="p-1.5 px-2 py-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-4 items-center justify-center">{section.icon}</div>
                  <span className="text-paragraph-xs text-text-strong font-medium">{section.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <span className="text-paragraph-xs font-medium">
                      {section.added > 0 && <span className="text-success-base">+{section.added}</span>}
                      {section.added > 0 && section.removed > 0 && ' '}
                      {section.removed > 0 && <span className="text-error-base">-{section.removed}</span>}
                    </span>
                    {(section.added > 0 || section.removed > 0) && renderDiffBars(section.added, section.removed)}
                  </div>
                  <RiExpandUpDownLine className="text-text-sub size-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PublishEnvironmentModal = ({
  open,
  onOpenChange,
  environment,
  currentEnvironment,
  onConfirm,
  isLoading,
}: PublishEnvironmentModalProps) => {
  const { data: diffData } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironment?._id,
    targetEnvironmentId: environment?._id,
    enabled: open && !!environment && !!currentEnvironment,
  });

  // Aggregate the summary from all resources
  const aggregatedSummary = diffData?.resources?.reduce(
    (acc, resource) => ({
      added: acc.added + resource.summary.added,
      modified: acc.modified + resource.summary.modified,
      deleted: acc.deleted + resource.summary.deleted,
      unchanged: acc.unchanged + resource.summary.unchanged,
    }),
    { added: 0, modified: 0, deleted: 0, unchanged: 0 }
  );

  const totalChanges = aggregatedSummary
    ? aggregatedSummary.added + aggregatedSummary.modified + aggregatedSummary.deleted
    : 0;
  const breakingChanges = aggregatedSummary?.deleted || 0;
  const warnings = aggregatedSummary?.modified || 0;
  const safeChanges = aggregatedSummary?.added || 0;

  // Create tree data structure from diff data
  const treeData: TreeDataItem[] = [
    {
      id: 'workflows',
      name: `Workflows (2)`,
      icon: <RiRouteFill className="text-text-strong size-4" />,
      openIcon: <RiArrowDownSLine className="text-text-sub size-4" />,
      selectedIcon: <RiArrowRightSLine className="text-text-sub size-4" />,
      children: [
        {
          id: 'password-reset',
          name: 'Password reset workflow',
          icon: <RiRouteFill className="text-text-strong size-4" />,
          openIcon: <RiArrowDownSLine className="text-text-sub size-4" />,
          selectedIcon: <RiArrowRightSLine className="text-text-sub size-4" />,
          children: [
            {
              id: 'payload-schema',
              name: 'Payload schema',
              icon: <RiListView className="text-text-sub size-4" />,
              children: [],
            },
            {
              id: 'step-changes',
              name: 'Step changes',
              icon: <RiPencilRuler2Line className="text-text-sub size-4" />,
              children: [],
            },
            {
              id: 'channel-preferences',
              name: 'Channel preferences',
              icon: <RiSettings3Line className="text-text-sub size-4" />,
              children: [],
            },
            {
              id: 'translations',
              name: 'Translations',
              icon: <RiTranslate2 className="text-text-sub size-4" />,
              children: [],
            },
          ],
        },
        {
          id: 'otp-flow',
          name: 'OTP flow',
          icon: <RiRouteFill className="text-text-sub size-4" />,
          selectedIcon: <RiArrowRightSLine className="text-text-sub size-4" />,
          children: [],
        },
        {
          id: 'email-confirmation',
          name: 'Email confirmation',
          icon: <RiRouteFill className="text-text-sub size-4" />,
          selectedIcon: <RiArrowRightSLine className="text-text-sub size-4" />,
          children: [],
        },
      ],
    },
    {
      id: 'layouts',
      name: 'Layouts (2)',
      icon: <RiLayout5Line className="text-text-sub size-4" />,
      selectedIcon: <RiArrowRightSLine className="text-text-sub size-4" />,
      children: [],
    },
    {
      id: 'shared-components',
      name: 'Shared components (2)',
      icon: <RiDashboardLine className="text-text-sub size-4" />,
      selectedIcon: <RiArrowRightSLine className="text-text-sub size-4" />,
      children: [],
    },
  ];

  if (!environment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[1380px] gap-0 p-0">
        <div className="border-stroke-soft border-b p-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-label-md text-text-strong">Publish changes</h2>
                <div className="bg-feature-lighter flex items-center gap-1.5 rounded px-2 py-0.5">
                  <div className="bg-feature-lighter flex h-4 w-4 items-center justify-center rounded-sm">
                    <EnvironmentBranchIcon environment={environment} size="sm" />
                  </div>
                  <span className="text-label-xs text-feature-base">{environment.name}</span>
                </div>
              </div>
              <p className="text-paragraph-xs text-text-soft">
                Publishing may cause breaking behavior. Please review before proceeding.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="border-stroke-soft bg-bg-white w-80 border-r">
            <TreeView
              data={treeData}
              className="p-2"
              initialSelectedItemId="password-reset"
              expandAll={false}
              defaultNodeIcon={<RiArrowRightSLine className="text-text-sub size-4" />}
              defaultLeafIcon={null}
            />
          </div>

          <div className="flex-1 bg-white">
            <div className="border-stroke-soft bg-bg-weak border-b px-3 py-3 pb-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="flex items-end gap-1">
                    <span className="text-label-sm text-text-strong relative top-[1px]">{totalChanges}</span>

                    <span className="text-paragraph-xs text-text-soft whitespace-nowrap">total changes</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-label-sm text-error-base relative top-[1px]">{breakingChanges}</span>

                    <span className="text-paragraph-xs text-text-soft whitespace-nowrap">breaking</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-label-sm text-warning-base relative top-[1px]">{warnings}</span>

                    <span className="text-paragraph-xs text-text-soft whitespace-nowrap">warnings</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-label-sm text-success-base relative top-[1px]">{safeChanges}</span>

                    <span className="text-paragraph-xs text-text-soft whitespace-nowrap">safe</span>
                  </div>
                </div>
                {breakingChanges > 0 && (
                  <div className="border-error-light bg-error-lighter flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <div className="flex size-3.5 items-center justify-center">
                      <div className="size-3.5 p-[2px]">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-full w-full"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M5 1.25C2.93 1.25 1.25 2.93 1.25 5C1.25 7.07 2.93 8.75 5 8.75C7.07 8.75 8.75 7.07 8.75 5C8.75 2.93 7.07 1.25 5 1.25ZM0.25 5C0.25 2.38 2.38 0.25 5 0.25C7.62 0.25 9.75 2.38 9.75 5C9.75 7.62 7.62 9.75 5 9.75C2.38 9.75 0.25 7.62 0.25 5ZM5 2.5C5.28 2.5 5.5 2.72 5.5 3V5.5C5.5 5.78 5.28 6 5 6C4.72 6 4.5 5.78 4.5 5.5V3C4.5 2.72 4.72 2.5 5 2.5ZM5 7.75C5.41 7.75 5.75 7.41 5.75 7C5.75 6.59 5.41 6.25 5 6.25C4.59 6.25 4.25 6.59 4.25 7C4.25 7.41 4.59 7.75 5 7.75Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="text-paragraph-xs text-error-base whitespace-nowrap font-medium">
                      {breakingChanges} breaking changes require immediate attention
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-6">
              <PublishWorkflowCard />
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 p-4">
              <div className="text-sm text-neutral-600">
                Last Published 2 days ago by <span className="font-medium">Dima</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" mode="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
                  Publish to {environment.name}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
