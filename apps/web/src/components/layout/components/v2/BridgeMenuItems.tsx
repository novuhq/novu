import { BridgeUpdateModal } from './BridgeUpdateModal';
import { SyncInfoModalTrigger } from './SyncInfoModalTrigger';

export function BridgeMenuItems() {
  return (
    <>
      <BridgeUpdateModal />
      <SyncInfoModalTrigger />
    </>
  );
}
