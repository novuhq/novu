import { useStudioState } from '../../../../studio/StudioStateProvider';
import { When } from '../../../utils/When';
import { BridgeUpdateModalTrigger } from './BridgeUpdateModalTrigger';
import { SyncInfoModalTrigger } from './SyncInfoModalTrigger';

export function BridgeMenuItems() {
  const { isLocalStudio } = useStudioState();

  return (
    <>
      <When truthy={!isLocalStudio}>
        <BridgeUpdateModalTrigger />
      </When>
      <When truthy={isLocalStudio}>
        <SyncInfoModalTrigger />
      </When>
    </>
  );
}
