import { RiLinkM } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { useBridgeUrlFocus } from './bridge-url-focus-context';
import { SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

type BridgeUrlSetupStepProps = {
  agent: AgentResponse;
  index: number;
  firstIncompleteStep: number;
};

export function BridgeUrlSetupStep({ agent, index, firstIncompleteStep }: BridgeUrlSetupStepProps) {
  const focusCtx = useBridgeUrlFocus();

  const activeUrl = agent.devBridgeActive ? (agent.devBridgeUrl ?? '') : (agent.bridgeUrl ?? '');
  const hasBridgeUrl = Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));

  return (
    <SetupStep
      index={index}
      status={deriveStepStatus(index, firstIncompleteStep)}
      title="Confirm your bridge URL"
      description="The CLI registers this automatically when the tunnel is running. If you already have a deployed bridge, you can paste it in instead."
      rightContent={
        <div className="flex flex-col gap-1.5">
          <SetupButton
            leadingIcon={<RiLinkM className="size-3.5" />}
            onClick={() => focusCtx?.focus()}
          >
            {hasBridgeUrl ? 'Edit bridge URL' : 'Set bridge URL'}
          </SetupButton>
          {hasBridgeUrl && (
            <span className="text-text-sub font-code max-w-[200px] truncate text-[11px]" title={activeUrl}>
              {activeUrl}
            </span>
          )}
        </div>
      }
    />
  );
}
