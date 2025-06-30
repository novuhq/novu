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
            },
            {
              id: 'step-changes',
              name: 'Step changes',
              icon: <RiPencilRuler2Line className="text-text-sub size-4" />,
            },
            {
              id: 'channel-preferences',
              name: 'Channel preferences',
              icon: <RiSettings3Line className="text-text-sub size-4" />,
            },
            {
              id: 'translations',
              name: 'Translations',
              icon: <RiTranslate2 className="text-text-sub size-4" />,
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
      <DialogContent className="w-full max-w-[1380px] p-0">
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

          {/* Main Content Area */}
          <div className="flex-1 bg-white">
            {/* Warning Banner */}
            <div className="border-l-4 border-orange-400 bg-orange-50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-orange-600">⚠️</span>
                <span className="text-sm text-orange-800">
                  Publishing may cause breaking behavior. Please review before proceeding.
                </span>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-6 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{totalChanges}</span>
                <span className="text-sm text-neutral-600">total changes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-red-600">{breakingChanges}</span>
                <span className="text-sm text-red-600">breaking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-orange-600">{warnings}</span>
                <span className="text-sm text-orange-600">warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-green-600">{safeChanges}</span>
                <span className="text-sm text-green-600">safe</span>
              </div>
              {breakingChanges > 0 && (
                <div className="ml-auto flex items-center gap-2 rounded-md bg-red-100 px-3 py-1">
                  <span className="text-red-600">🚨</span>
                  <span className="text-sm font-medium text-red-700">
                    {breakingChanges} breaking changes require immediate attention
                  </span>
                </div>
              )}
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
