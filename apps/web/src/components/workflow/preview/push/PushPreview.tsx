import { MobileSimulator } from '../common';
import Content from './Content';

export function PushPreview({ showLoading = false }: { showLoading?: boolean }) {
  return (
    <div>
      <MobileSimulator withBackground>
        <Content showLoading={showLoading} />
      </MobileSimulator>
    </div>
  );
}
