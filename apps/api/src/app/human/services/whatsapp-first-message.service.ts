import { Injectable } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import { type IntegrationEntity, IntegrationRepository } from '@novu/dal';
import type { ICredentials } from '@novu/shared';
import {
  createMessageTemplate,
  extractMetaError,
  findMessageTemplate,
  type MetaErrorSummary,
} from '../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import {
  AGENT_NAME_EXAMPLE,
  AGENT_NAME_VARIABLE,
  FIRST_MESSAGE_LANGUAGE,
  nextFirstMessageName,
  VIEW_MESSAGE_BUTTON,
} from './whatsapp-first-message';

/** Where the operator's first-message template stands, as stored on their WhatsApp integration. */
export type FirstMessageState = {
  /** Meta's review status of the latest submission: PENDING, APPROVED, REJECTED, PAUSED, DISABLED or IN_APPEAL. */
  status: string;
  body: string;
  rejectedReason?: string;
  /** The last version Meta approved, which sends use while a later one is under review. */
  approved?: { name: string; body: string };
};

/** How long a stored PENDING status stands before it's read from Meta again. */
const RECHECK_AFTER_MS = 60_000;
/** A status read happens on page loads and sends, so it never waits long on Meta. */
const STATUS_TIMEOUT_MS = 3_000;
const UNDER_REVIEW = new Set(['PENDING', 'IN_APPEAL']);

/** A Meta refusal of a template submission, with Meta's code for the caller to word. */
export class FirstMessageSubmitError extends Error {
  constructor(readonly meta: MetaErrorSummary) {
    super(meta.message);
  }
}

/**
 * The first-message template on the operator's own WhatsApp Business account: submitting it for Meta's review and
 * reading where the review stands. State lives on the integration's credentials; the business token never leaves
 * this service.
 */
@Injectable()
export class WhatsAppFirstMessageService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(WhatsAppFirstMessageService.name);
  }

  /**
   * The stored state, read from Meta again while a submission is under review and the last read is over a minute
   * old. A failed read keeps what was stored.
   */
  async read(integration: IntegrationEntity): Promise<FirstMessageState | undefined> {
    const credentials = decryptCredentials(integration.credentials ?? {});
    const stored = stateOf(credentials);
    if (!stored || !UNDER_REVIEW.has(stored.status)) {
      return stored;
    }

    const checkedAt = Date.parse(credentials.whatsappTemplateCheckedAt ?? '');
    if (Number.isFinite(checkedAt) && Date.now() - checkedAt < RECHECK_AFTER_MS) {
      return stored;
    }

    const { apiToken, businessAccountId, whatsappTemplateName } = credentials;
    if (!apiToken || !businessAccountId || !whatsappTemplateName) {
      return stored;
    }

    try {
      const found = await findMessageTemplate({
        accessToken: apiToken,
        wabaId: businessAccountId,
        name: whatsappTemplateName,
        timeoutMs: STATUS_TIMEOUT_MS,
      });
      if (found.error || !found.template?.status) {
        return stored;
      }

      const status = found.template.status;
      const rejectedReason = presentReason(found.template.rejected_reason);
      await this.save(integration, {
        whatsappTemplateStatus: status,
        whatsappTemplateRejectedReason: rejectedReason ?? '',
        whatsappTemplateCheckedAt: new Date().toISOString(),
        ...(status === 'APPROVED'
          ? { whatsappTemplateApprovedName: whatsappTemplateName, whatsappTemplateApprovedBody: stored.body }
          : {}),
      });

      const { rejectedReason: _previous, ...rest } = stored;

      return {
        ...rest,
        status,
        ...(rejectedReason ? { rejectedReason } : {}),
        ...(status === 'APPROVED' ? { approved: { name: whatsappTemplateName, body: stored.body } } : {}),
      };
    } catch (error) {
      this.logger.warn({ err: error, integrationId: integration._id }, 'Could not read the WhatsApp template status');

      return stored;
    }
  }

  /**
   * Sends a new body for Meta's review. The same body already pending or approved is left as it is. A name Meta
   * already has (a retry after a lost answer) is adopted instead of failing.
   */
  async submit(integration: IntegrationEntity, body: string): Promise<FirstMessageState> {
    const credentials = decryptCredentials(integration.credentials ?? {});
    const stored = stateOf(credentials);
    if (stored && stored.body === body && ['PENDING', 'IN_APPEAL', 'APPROVED'].includes(stored.status)) {
      return stored;
    }

    const { apiToken, businessAccountId } = credentials;
    if (!apiToken || !businessAccountId) {
      throw new FirstMessageSubmitError({ message: 'Connect your WhatsApp Business account first.' });
    }

    const name = nextFirstMessageName(credentials.whatsappTemplateName);
    const created = await createMessageTemplate({
      accessToken: apiToken,
      wabaId: businessAccountId,
      template: {
        name,
        language: FIRST_MESSAGE_LANGUAGE,
        body,
        examples: { [AGENT_NAME_VARIABLE]: AGENT_NAME_EXAMPLE },
        quickReplies: [VIEW_MESSAGE_BUTTON],
      },
    });
    const error = extractMetaError(created.body);
    let id = created.body.id;
    let status = created.body.status;
    if (error || created.statusCode >= 400 || !id) {
      const existing = await findMessageTemplate({ accessToken: apiToken, wabaId: businessAccountId, name }).catch(
        () => undefined
      );
      if (!existing?.template?.id) {
        throw new FirstMessageSubmitError(error ?? { message: `Meta answered ${created.statusCode}.` });
      }

      id = existing.template.id;
      status = existing.template.status;
    }

    const state = {
      status: status ?? 'PENDING',
      body,
      ...(stored?.approved ? { approved: stored.approved } : {}),
    };
    await this.save(integration, {
      whatsappTemplateName: name,
      whatsappTemplateId: id,
      whatsappTemplateStatus: state.status,
      whatsappTemplateBody: body,
      whatsappTemplateRejectedReason: '',
      whatsappTemplateCheckedAt: new Date().toISOString(),
      ...(state.status === 'APPROVED'
        ? { whatsappTemplateApprovedName: name, whatsappTemplateApprovedBody: body }
        : {}),
    });

    return state.status === 'APPROVED' ? { ...state, approved: { name, body } } : state;
  }

  private async save(integration: IntegrationEntity, fields: Record<string, string>): Promise<void> {
    const $set = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`credentials.${key}`, value]));

    await this.integrationRepository.update(
      {
        _id: integration._id,
        _environmentId: integration._environmentId,
        _organizationId: integration._organizationId,
      },
      { $set }
    );
  }
}

function stateOf(credentials: ICredentials): FirstMessageState | undefined {
  const status = credentials.whatsappTemplateStatus;
  const body = credentials.whatsappTemplateBody;
  if (!status || !body) {
    return undefined;
  }

  const approvedName = credentials.whatsappTemplateApprovedName;
  const approvedBody = credentials.whatsappTemplateApprovedBody;
  const rejectedReason = presentReason(credentials.whatsappTemplateRejectedReason);

  return {
    status,
    body,
    ...(rejectedReason ? { rejectedReason } : {}),
    ...(approvedName && approvedBody ? { approved: { name: approvedName, body: approvedBody } } : {}),
  };
}

/** Meta says `NONE` when nothing was rejected. */
function presentReason(reason: unknown): string | undefined {
  return typeof reason === 'string' && reason && reason !== 'NONE' ? reason : undefined;
}
