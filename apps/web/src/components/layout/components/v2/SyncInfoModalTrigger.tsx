import { Button } from '@novu/novui';
import { IconOutlineCloudUpload } from '@novu/novui/icons';
import { useState } from 'react';
import { SyncInfoModal } from './SyncInfoModal';

export function SyncInfoModalTrigger() {
  const [showSyncInfoModal, setShowSyncInfoModal] = useState(false);

  const toggleSyncInfoModalShow = () => {
    setShowSyncInfoModal((previous) => !previous);
  };

  return (
    <>
      <Button size="xs" Icon={IconOutlineCloudUpload} onClick={toggleSyncInfoModalShow}>
        Sync
      </Button>
      {/** TODO: use a modal manager */}
      <SyncInfoModal isOpen={showSyncInfoModal} toggleOpen={toggleSyncInfoModalShow} />
    </>
  );
}
