import { useStudioState } from '../StudioStateProvider';

export function useBridgeURL(tunnel = false) {
  const studioState = useStudioState();

  let bridgeURL;

  if (studioState.isLocalStudio) {
    /*
     * Local studio mode.
     * Prefer local host for bridge discovery as it's faster
     *
     * TODO: Do we need to store it for full page reloads on local studio?
     */
    bridgeURL = tunnel ? studioState.tunnelBridgeURL : studioState.localBridgeURL || studioState.tunnelBridgeURL;
  } else {
    // Cloud mode
    bridgeURL = studioState.storedBridgeURL;
  }

  return bridgeURL;
}
