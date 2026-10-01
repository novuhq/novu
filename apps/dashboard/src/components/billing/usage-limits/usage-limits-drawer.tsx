import { useEffect } from 'react';
import { RiCloseFill } from 'react-icons/ri';
import { CompactButton } from '@/components/primitives/button-compact';
import { NonModalSheet, SheetClose, SheetDescription, SheetHeader, SheetTitle } from '@/components/primitives/sheet';
import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { UsageLimitsForm } from './usage-limits-form';
import type { UsageLimitsView } from './usage-limits-view';
import { useUsageLimitsDrawerParam } from './use-usage-limits-drawer-param';

function showBillingAdminsOnlyToast() {
  showToast({
    children: () => (
      <>
        <ToastIcon variant="info" />
        <span className="text-sm">Only billing admins can change usage limits</span>
      </>
    ),
    options: { id: 'usage-limits-billing-admins-only' },
  });
}

type UsageLimitsDrawerProps = {
  view: UsageLimitsView;
};

export function UsageLimitsDrawer({ view }: UsageLimitsDrawerProps) {
  const { isDrawerRequested, setIsDrawerRequested } = useUsageLimitsDrawerParam();
  const { canEdit, isConfigurable } = view;

  useEffect(() => {
    if (!isDrawerRequested || canEdit) {
      return;
    }

    setIsDrawerRequested(false);

    if (isConfigurable) {
      showBillingAdminsOnlyToast();
    }
  }, [isDrawerRequested, canEdit, isConfigurable, setIsDrawerRequested]);

  return (
    <NonModalSheet
      open={isDrawerRequested && canEdit}
      onOpenChange={setIsDrawerRequested}
      className="w-[400px] border-l-0"
      hideCloseButton
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <SheetHeader className="flex-row items-start justify-between space-y-0 border-b border-stroke-soft bg-bg-weak px-3 pt-3.5 pb-[13px]">
        <div className="flex flex-col gap-0.5">
          <SheetTitle className="text-label-md font-medium text-text-strong">Usage limits</SheetTitle>
          <SheetDescription className="text-label-xs text-text-soft">
            Set monthly limits for on-demand usage. Resets based on your billing cycle.
          </SheetDescription>
        </div>
        <SheetClose asChild>
          <CompactButton size="sm" variant="ghost" icon={RiCloseFill} aria-label="Close" />
        </SheetClose>
      </SheetHeader>
      {/* The form mounts with the sheet content, so every open starts from the latest subscription. */}
      <UsageLimitsForm view={view} onClose={() => setIsDrawerRequested(false)} />
    </NonModalSheet>
  );
}
