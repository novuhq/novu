import { useState } from 'react';
import { NewLayoutDrawer } from '@/pages/new-layout-drawer';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { useLayoutsNavigate } from '@/components/layouts/hooks/use-layouts-navigate';

export function CreateLayoutPage() {
  const [isOpen, setIsOpen] = useState(true);
  const { navigateToLayoutsPage } = useLayoutsNavigate();
  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigateToLayoutsPage();
    },
    condition: !isOpen,
  });

  return (
    <NewLayoutDrawer
      ref={unmountRef}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSuccess={() => {
        // TODO: navigate to the layout editor page
        navigateToLayoutsPage();
      }}
      onCancel={() => navigateToLayoutsPage()}
    />
  );
}
