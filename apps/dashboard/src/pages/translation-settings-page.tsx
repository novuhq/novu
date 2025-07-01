import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TranslationSettingsDrawer } from '@/components/translations/translation-settings-drawer';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';

export function TranslationSettingsPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigate(-1);
    },
    condition: !open,
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return <TranslationSettingsDrawer ref={unmountRef} isOpen={open} onOpenChange={handleOpenChange} />;
}
