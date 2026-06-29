import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ConnectionSuccessFooter } from './connection-success-footer';

type AgentIntegrationGuideTransitionProps = {
  isConnected: boolean;
  providerDisplayName: string;
  /** Whether this provider's connected view implements the user-rollout "what's next" phase. */
  hasUserRolloutPhase: boolean;
  /** Builds the setup card; `footer` is rendered inline at the end of the card body. */
  renderSetupView: (footer: ReactNode) => ReactNode;
  /** `justConnected` is true only for an in-session connect (used to carry the celebration over). */
  renderConnectedView: (justConnected: boolean) => ReactNode;
  /** Fires when the user clicks Continue after an in-session connect. */
  onContinued?: () => void;
};

/**
 * Drives the setup → connected transition for an integration:
 *
 * - Already connected on mount (page refresh / revisit): render the connected view immediately —
 *   no flash of the setup guide, and no celebration replay.
 * - Connected during the session while on the setup guide: keep the setup guide on screen and
 *   surface an explicit "Continue" step *inline at the end of the setup card*. We deliberately avoid
 *   an automatic / timed transition — the connection can land while the user is still in the Slack
 *   app (sending the first message), so the user must always return to a stable success screen and
 *   move forward themselves. Continuing carries the celebration over via `justConnected`.
 *
 * This component is mounted with a `key` of the integration id, so switching integrations resets
 * the transition cleanly.
 */
export function AgentIntegrationGuideTransition({
  isConnected,
  providerDisplayName,
  hasUserRolloutPhase,
  renderSetupView,
  renderConnectedView,
  onContinued,
}: AgentIntegrationGuideTransitionProps) {
  const connectedOnMountRef = useRef(isConnected);
  const [hasContinued, setHasContinued] = useState(false);
  const onContinuedRef = useRef(onContinued);
  onContinuedRef.current = onContinued;

  // Only celebrate / gate a connection that happened while the user was watching the setup guide;
  // an integration that was already connected on mount goes straight to its connected view.
  const justConnected = !connectedOnMountRef.current;
  const showConnected = connectedOnMountRef.current || hasContinued;
  const showContinueStep = justConnected && isConnected && !hasContinued;

  useEffect(() => {
    if (!showConnected) return;

    onContinuedRef.current?.();
  }, [showConnected]);

  if (showConnected) {
    return <>{renderConnectedView(justConnected)}</>;
  }

  const footer = showContinueStep ? (
    <ConnectionSuccessFooter
      providerDisplayName={providerDisplayName}
      hasUserRolloutPhase={hasUserRolloutPhase}
      onContinue={() => {
        setHasContinued(true);
      }}
    />
  ) : null;

  return <>{renderSetupView(footer)}</>;
}
