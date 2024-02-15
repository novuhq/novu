import { MobileSimulator } from '../common';
import Content from './Content';

export function PushPreview({
  showLoading = false,
  showOverlay = true,
}: {
  showLoading?: boolean;
  showOverlay?: boolean;
}) {
  return (
    <div>
      <MobileSimulator withBackground>
        <Content showLoading={showLoading} showOverlay={showOverlay} />
      </MobileSimulator>
    </div>
  );
}
