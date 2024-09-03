import { MobileSimulator } from '../common';
import Content from './Content';

export function PushPreview({
  showLoading = false,
  showOverlay = true,
  controlVariables,
}: {
  showLoading?: boolean;
  showOverlay?: boolean;
  controlVariables?: any;
}) {
  return (
    <div>
      <MobileSimulator withBackground>
        <Content controlVariables={controlVariables} showLoading={showLoading} showOverlay={showOverlay} />
      </MobileSimulator>
    </div>
  );
}
