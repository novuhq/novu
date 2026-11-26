import type { AgentApprovalPart } from '@novu/js';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { describeCopilotChange, getApprovalIntegrationId } from './copilot-approval';
import { useCopilotWebChat } from './copilot-web-chat-context';

/**
 * A change the Copilot wants to make outside the workflow editor. It runs only after Approve; Reject tells the
 * Copilot nothing was changed. Once decided, the card shrinks to a one-line record.
 */
export function CopilotApprovalBlock({ part }: { part: AgentApprovalPart }) {
  const { chat } = useCopilotWebChat();
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const [isResponding, setIsResponding] = useState(false);

  const integrationId = getApprovalIntegrationId(part);
  const integration = integrationId ? integrations?.find((candidate) => candidate._id === integrationId) : undefined;
  const change = describeCopilotChange(part, {
    name: integration?.name,
    environmentName: integration ? currentEnvironment?.name : undefined,
  });

  if (part.state !== 'pending') {
    return (
      <p className="text-xs leading-4 text-text-soft">
        {part.state === 'approved' ? 'Approved' : 'Rejected'}: {change}.
      </p>
    );
  }

  const respond = async (decision: 'approved' | 'denied') => {
    if (!chat || isResponding) return;

    setIsResponding(true);
    const { error } = await chat.respondToAction({ approvalId: part.approvalId, decision });
    if (!error) return;

    setIsResponding(false);
    showErrorToast("Couldn't reach the Copilot. Try again.");
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-stroke-soft bg-bg-weak p-3">
      <p className="text-xs font-medium leading-4 text-text-strong">Approve this change?</p>
      <p className="text-xs leading-4 text-text-soft">{change}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="2xs"
          variant="secondary"
          mode="outline"
          disabled={isResponding}
          onClick={() => respond('denied')}
        >
          Reject
        </Button>
        <Button
          type="button"
          size="2xs"
          variant="primary"
          mode="filled"
          disabled={isResponding}
          onClick={() => respond('approved')}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}
