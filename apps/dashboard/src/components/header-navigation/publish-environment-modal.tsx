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
} from 'react-icons/ri';

type PublishEnvironmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment: any;
  currentEnvironment: any;
  onConfirm: () => void;
  isLoading?: boolean;
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

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
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

            {/* Content Area */}
            <div className="flex-1 p-6">
              <div className="text-center text-neutral-500">
                <div className="mb-4">
                  <span className="text-4xl">📊</span>
                </div>
                <h3 className="mb-2 text-lg font-medium">Select an item to view changes</h3>
                <p className="text-sm">Choose a workflow or component from the sidebar to see detailed changes</p>
              </div>
            </div>

            {/* Footer */}
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
