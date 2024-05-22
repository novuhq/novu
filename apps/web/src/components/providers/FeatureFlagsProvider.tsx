import { LaunchDarklyProvider } from '../launch-darkly/LaunchDarklyProvider';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '@novu/shared-web';

export function FeatureFlagsProvider({ children }) {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID ? <LaunchDarklyProvider>{children}</LaunchDarklyProvider> : <>{children}</>;
}
