import { Injectable } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import { type IntegrationEntity, IntegrationRepository } from '@novu/dal';
import type { ICredentials } from '@novu/shared';
import {
  createMessageTemplate,
  extractMetaError,
  findMessageTemplate,
  type MetaErrorSummary,
  templateBodyOf,
} from '../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import {
  AGENT_NAME_EXAMPLE,
  AGENT_NAME_VARIABLE,
  FIRST_MESSAGE_LANGUAGE,
  nextFirstMessageName,
  usesAgentName,
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

    // Noted before asking, so while Meta can't be reached every read and send doesn't ask again and wait on it.
    await this.save(integration, { whatsappTemplateCheckedAt: new Date().toISOString() }, whatsappTemplateName).catch(
      () => undefined
    );

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
      // Only onto the submission that was checked: a newer edit saved meanwhile keeps its own review.
      await this.save(
        integration,
        {
          whatsappTemplateStatus: status,
          whatsappTemplateRejectedReason: rejectedReason ?? '',
          ...(status === 'APPROVED'
            ? { whatsappTemplateApprovedName: whatsappTemplateName, whatsappTemplateApprovedBody: stored.body }
            : {}),
        },
        whatsappTemplateName
      );

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

    const access = { accessToken: apiToken, wabaId: businessAccountId };
    let name = nextFirstMessageName(credentials.whatsappTemplateName);
    let created = await this.create(access, name, body);
    // Another submission may have taken the name first, with other words: this text goes under the next one.
    if (created.taken) {
      name = nextFirstMessageName(name);
      created = await this.create(access, name, body);
    }

    if (!created.id) {
      throw new FirstMessageSubmitError(created.error ?? { message: 'Meta didn’t take the message.' });
    }

    const { id, status } = created;

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

  /**
   * Submits one template. A name Meta already has is adopted only when it holds this very text (a retry after a
   * lost answer); with other words, `taken` says to try the next name.
   */
  private async create(
    access: { accessToken: string; wabaId: string },
    name: string,
    body: string
  ): Promise<{ id?: string; status?: string; error?: MetaErrorSummary; taken?: boolean }> {
    const created = await createMessageTemplate({
      ...access,
      template: {
        name,
        language: FIRST_MESSAGE_LANGUAGE,
        body,
        examples: usesAgentName(body) ? { [AGENT_NAME_VARIABLE]: AGENT_NAME_EXAMPLE } : {},
        quickReplies: [VIEW_MESSAGE_BUTTON],
      },
    });
    const error = extractMetaError(created.body);
    if (!error && created.statusCode < 400 && created.body.id) {
      return { id: created.body.id, status: created.body.status };
    }

    const existing = await findMessageTemplate({ ...access, name }).catch(() => undefined);
    if (!existing?.template?.id) {
      return { error: error ?? { message: `Meta answered ${created.statusCode}.` } };
    }

    if (templateBodyOf(existing.template) !== body) {
      return { taken: true };
    }

    return { id: existing.template.id, status: existing.template.status };
  }

  /** Saves onto the integration; with `onlyFor`, only while that template is still the latest submission. */
  private async save(integration: IntegrationEntity, fields: Record<string, string>, onlyFor?: string): Promise<void> {
    const $set = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`credentials.${key}`, value]));

    await this.integrationRepository.update(
      {
        _id: integration._id,
        _environmentId: integration._environmentId,
        _organizationId: integration._organizationId,
        ...(onlyFor ? { 'credentials.whatsappTemplateName': onlyFor } : {}),
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
