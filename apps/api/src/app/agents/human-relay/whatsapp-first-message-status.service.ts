import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { type HumanInteractionHoldFailure, HumanInteractionRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';

type MetaStatus = {
  id?: string;
  status?: string;
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
    error_data?: { details?: string };
    /** Where Meta says to fix it, such as the WhatsApp Business account's billing page. */
    href?: string;
  }>;
};

/**
 * Meta can report a failure before the send saved its hold (written once the first message went out and its
 * conversation was filed), so a status that matches nothing yet is tried again this many times, a second apart.
 */
const MATCH_ATTEMPTS = 4;
const MATCH_RETRY_MS = 1_000;

type MetaWebhook = { entry?: Array<{ changes?: Array<{ value?: { statuses?: MetaStatus[] } }> }> };

/**
 * Meta accepts a first message and can fail it afterwards, such as when the WhatsApp Business account has no
 * payment method, and says so only in its webhook's delivery statuses. The chat adapter drops those, so this reads
 * the failed ones and notes on what the first message stood in for why it never arrived. Called only for verified
 * WhatsApp webhooks to the relay; a status for any other message costs one indexed read.
 */
@Injectable()
export class WhatsAppFirstMessageStatus {
  /** Swapped in tests, so they don't wait. */
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

    // All of a webhook's failures are tried together, and only the ones that matched nothing yet wait a round, so
    // an ordinary message's failure never holds up a first message's.
    let pending = failedStatusesOf(payload).map((status) => ({
      id: status.id as string,
      failure: describeFailure(status),
    }));
    for (let attempt = 0; attempt < MATCH_ATTEMPTS && pending.length > 0; attempt += 1) {
      if (attempt > 0) {
        await this.sleep(MATCH_RETRY_MS);
      }

      const rows = await Promise.all(
        pending.map(({ id, failure }) => this.recordOnce(config.environmentId, id, failure))
      );
      pending = pending.filter((_, index) => !rows[index]);
    }
  }

  /** One try at noting a failure on the hold that sent this first message; null when none matched or it failed. */
  private async recordOnce(environmentId: string, templateMessageId: string, failure: HumanInteractionHoldFailure) {
    const row = await this.humanInteractionRepository
      .recordHoldFailure(environmentId, templateMessageId, failure)
      .catch((err) => {
        this.logger.warn({ err, templateMessageId }, 'Could not record a failed WhatsApp first message');

        return null;
      });
    if (row) {
      this.logger.warn(
        { interactionIdentifier: row.identifier, code: failure.code },
        'Meta did not deliver the WhatsApp first message'
      );
    }

    return row;
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

/**
 * Meta's reason, with where to fix it, so an agent can pass both on: Meta's own sentence usually names the fix and
 * links to it (for 131042, the account's billing page to set a currency and payment method).
 */
export function describeFailure(status: MetaStatus): HumanInteractionHoldFailure {
  const [error] = status.errors ?? [];
  const code = error?.code;
  const at = new Date().toISOString();
  const details = error?.error_data?.details?.trim();
  const reason =
    details ||
    (code === 131042
      ? 'your WhatsApp Business account has no payment method or currency set up'
      : error?.message || error?.title);
  const link = error?.href && !details?.includes(error.href) ? ` Fix it here: ${error.href}` : '';
  const sentence = reason ? `: ${reason.replace(/\.$/, '')}.` : '.';

  return { ...(code ? { code } : {}), message: `Meta didn’t deliver the first message${sentence}${link}`, at };
}
