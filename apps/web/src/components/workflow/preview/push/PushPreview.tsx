import { MobileSimulator } from '../common';
import Content from './Content';

export function PushPreview() {
  return (
    <div>
      <MobileSimulator withBackground>
        <Content />
      </MobileSimulator>
    </div>
  );
}
