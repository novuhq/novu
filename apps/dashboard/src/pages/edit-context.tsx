import { PermissionsEnum } from '@novu/shared';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ContextDrawer } from '@/components/contexts/context-drawer';
import { useContextsNavigate } from '@/components/contexts/hooks/use-contexts-navigate';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';

export const EditContextPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [open, setOpen] = useState(true);
  const { navigateToContextsPage } = useContextsNavigate();
  const has = useHasPermission();

  const isReadOnly = !has({ permission: PermissionsEnum.WORKFLOW_WRITE });

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigateToContextsPage();
    },
    condition: !open,
  });

  if (!type || !id) {
    return null;
  }

  return (
    <ContextDrawer ref={unmountRef} open={open} onOpenChange={setOpen} type={type} id={id} readOnly={isReadOnly} />
  );
};
