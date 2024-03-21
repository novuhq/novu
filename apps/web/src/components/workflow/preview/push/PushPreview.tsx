import { MobileSimulator } from '../common';
import Content from './Content';

export function PushPreview({
  showLoading = false,
  showOverlay = true,
  inputVariables,
}: {
  showLoading?: boolean;
  showOverlay?: boolean;
  inputVariables?: any;
}) {
  return (
    <div>
      <MobileSimulator withBackground>
        <Content inputVariables={inputVariables} showLoading={showLoading} showOverlay={showOverlay} />
      </MobileSimulator>
    </div>
  );
}
