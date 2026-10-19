import { useState } from 'react';
import { CreateContextDrawer } from '@/components/contexts/create-context-drawer';
import { useContextsNavigate } from '@/components/contexts/hooks/use-contexts-navigate';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';

export const CreateContextPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { navigateToContextsPage } = useContextsNavigate();

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigateToContextsPage();
    },
    condition: !isOpen,
  });

  return (
    <CreateContextDrawer
      ref={unmountRef}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSuccess={() => navigateToContextsPage()}
      onCancel={() => navigateToContextsPage()}
    />
  );
};
