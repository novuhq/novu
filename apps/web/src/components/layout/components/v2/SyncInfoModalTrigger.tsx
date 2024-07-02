import { Button } from '@novu/novui';
import { IconOutlineCloudUpload } from '@novu/novui/icons';
import { useState } from 'react';
import { useSegment } from '../../../providers/SegmentProvider';
import { SyncInfoModal } from './SyncInfoModal';

export function SyncInfoModalTrigger() {
  const [showSyncInfoModal, setShowSyncInfoModal] = useState(false);
  const segment = useSegment();

  const toggleSyncInfoModalShow = () => {
    setShowSyncInfoModal((previous) => !previous);
    segment.track('Workflow sync button clicked - [Studio]');
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
