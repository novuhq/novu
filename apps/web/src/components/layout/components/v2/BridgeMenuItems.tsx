import { BridgeUpdateModalTrigger } from './BridgeUpdateModalTrigger';
import { SyncInfoModalTrigger } from './SyncInfoModalTrigger';

export function BridgeMenuItems() {
  return (
    <>
      <BridgeUpdateModalTrigger />
      <SyncInfoModalTrigger />
    </>
  );
}
