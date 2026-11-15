import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { type HumanInteractionHoldFailure, HumanInteractionRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';

type MetaStatus = {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

type MetaWebhook = { entry?: Array<{ changes?: Array<{ value?: { statuses?: MetaStatus[] } }> }> };

/**
 * Meta accepts a first message and can fail it afterwards, such as when the WhatsApp Business account has no
 * payment method, and says so only in its webhook's delivery statuses. The chat adapter drops those, so this reads
 * the failed ones and notes on what the first message stood in for why it never arrived. Called only for verified
 * WhatsApp webhooks to the relay; a status for any other message costs one indexed read.
 */
@Injectable()
export class WhatsAppFirstMessageStatus {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(WhatsAppFirstMessageStatus.name);
  }

  async record(
    config: { environmentId: string; platform: string; isHumanRelay?: boolean },
    payload: unknown
  ): Promise<void> {
    if (config.platform !== AgentPlatformEnum.WHATSAPP || !config.isHumanRelay) {
      return;
    }

    for (const status of failedStatusesOf(payload)) {
      const failure = describeFailure(status);
      const row = await this.humanInteractionRepository.recordHoldFailure(
        config.environmentId,
        status.id as string,
        failure
      );
      if (row) {
        this.logger.warn(
          { interactionIdentifier: row.identifier, code: failure.code },
          'Meta did not deliver the WhatsApp first message'
        );
      }
    }
  }
}

function failedStatusesOf(payload: unknown): MetaStatus[] {
  const webhook = typeof payload === 'string' ? parseWebhook(payload) : (payload as MetaWebhook | undefined);

  return (webhook?.entry ?? [])
    .flatMap((entry) => entry.changes ?? [])
    .flatMap((change) => change.value?.statuses ?? [])
    .filter((status) => status.status === 'failed' && typeof status.id === 'string');
}

function parseWebhook(text: string): MetaWebhook | undefined {
  try {
    return JSON.parse(text) as MetaWebhook;
  } catch {
    return undefined;
  }
}

/** Meta's reason, in words the operator can act on where its code says what to do. */
export function describeFailure(status: MetaStatus): HumanInteractionHoldFailure {
  const [error] = status.errors ?? [];
  const code = error?.code;
  const at = new Date().toISOString();

  if (code === 131042) {
    return {
      code,
      message:
        'Meta didn’t deliver the first message: your WhatsApp Business account has no payment method or currency set up.',
      at,
    };
  }

  const reason = error?.error_data?.details || error?.message || error?.title;

  return {
    ...(code ? { code } : {}),
    message: `Meta didn’t deliver the first message${reason ? `: ${reason}` : ''}.`,
    at,
  };
}
