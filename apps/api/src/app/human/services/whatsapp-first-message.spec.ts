import { encryptCredentials } from '@novu/application-generic';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  DEFAULT_FIRST_MESSAGE,
  fillFirstMessage,
  firstMessageProblem,
  nextFirstMessageName,
  usesAgentName,
} from './whatsapp-first-message';
import { FirstMessageSubmitError, WhatsAppFirstMessageService } from './whatsapp-first-message.service';

describe('WhatsApp first message', () => {
  describe('firstMessageProblem', () => {
    it('takes our own message', () => {
      expect(firstMessageProblem(DEFAULT_FIRST_MESSAGE)).to.equal(null);
    });

    it('takes a message without the agent’s name', () => {
      expect(firstMessageProblem('You have a new message. Reply here to read it.')).to.equal(null);
    });

    it('takes the variable with spaces inside its braces, and reads a long run of them at once', () => {
      expect(firstMessageProblem('A message from {{ agent_name }} for you.')).to.equal(null);
      expect(usesAgentName('A message from {{ agent_name }} for you.')).to.equal(true);

      const started = Date.now();
      expect(usesAgentName(`${'{{'.repeat(2000)}${' '.repeat(200_000)}`)).to.equal(false);
      expect(Date.now() - started).to.be.lessThan(500);
    });

    it('turns down what Meta would', () => {
      expect(firstMessageProblem('   ')).to.contain('Write the message');
      expect(firstMessageProblem('a'.repeat(1025))).to.contain('1024');
      expect(firstMessageProblem('Hi {{name}}, reply here.')).to.contain('only variable');
      expect(firstMessageProblem('Hi {{agent_name}} and {{agent_name}} again.')).to.contain('once');
      expect(firstMessageProblem('{{agent_name}} has a message for you.')).to.contain('start or end');
      expect(firstMessageProblem('You have a message from {{agent_name}}')).to.contain('start or end');
      expect(firstMessageProblem('Hi {{agent_name, reply here.')).to.contain('Write the variable');
      expect(firstMessageProblem('Hi\n\n\n\nthere')).to.contain('empty line');
    });
  });

  it('fills the agent’s name in', () => {
    expect(fillFirstMessage(DEFAULT_FIRST_MESSAGE, 'Atlas')).to.equal(
      'You have a message from Atlas. Reply here to view it.'
    );
  });

  it('names each new version after the last', () => {
    expect(nextFirstMessageName(undefined)).to.equal('agentinbox_first_message');
    expect(nextFirstMessageName('agentinbox_first_message')).to.equal('agentinbox_first_message_2');
    expect(nextFirstMessageName('agentinbox_first_message_2')).to.equal('agentinbox_first_message_3');
  });

  describe('WhatsAppFirstMessageService', () => {
    let request: sinon.SinonStub;

    beforeEach(() => {
      request = sinon.stub(safeOutboundHttp, 'safeOutboundJsonRequest');
    });

    afterEach(() => {
      sinon.restore();
    });

    function setup(credentials: Record<string, unknown>) {
      const integrationRepository = { update: sinon.stub().resolves() };
      const logger = { setContext: sinon.stub(), warn: sinon.stub() };
      const service = new WhatsAppFirstMessageService(integrationRepository as never, logger as never);
      const integration = {
        _id: 'int-wa',
        _environmentId: 'env1',
        _organizationId: 'org1',
        credentials: encryptCredentials({ apiToken: 'token', businessAccountId: 'waba1', ...credentials } as never),
      };

      return { service, integration: integration as never, integrationRepository };
    }

    const savedFields = (repository: { update: sinon.SinonStub }) => repository.update.firstCall.args[1].$set;

    it('submits a UTILITY template with the named variable, its example and the View message button', async () => {
      const { service, integration, integrationRepository } = setup({});
      request.resolves({ statusCode: 200, body: { id: 'tpl1', status: 'PENDING', category: 'UTILITY' } });

      const state = await service.submit(integration, DEFAULT_FIRST_MESSAGE);

      const call = request.firstCall.args[0];
      expect(String(call.url)).to.contain('/waba1/message_templates');
      expect(call.body).to.deep.include({
        name: 'agentinbox_first_message',
        language: 'en',
        category: 'UTILITY',
        parameter_format: 'NAMED',
      });
      expect(call.body.components).to.deep.equal([
        {
          type: 'BODY',
          text: DEFAULT_FIRST_MESSAGE,
          example: { body_text_named_params: [{ param_name: 'agent_name', example: 'Atlas' }] },
        },
        { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'View message' }] },
      ]);
      expect(state).to.deep.equal({ status: 'PENDING', body: DEFAULT_FIRST_MESSAGE });
      expect(savedFields(integrationRepository)).to.include({
        'credentials.agentInboxWhatsappTemplateName': 'agentinbox_first_message',
        'credentials.agentInboxWhatsappTemplateId': 'tpl1',
        'credentials.agentInboxWhatsappTemplateStatus': 'PENDING',
      });
    });

    it('leaves the same body alone while it is under review', async () => {
      const { service, integration } = setup({
        agentInboxWhatsappTemplateName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateStatus: 'PENDING',
        agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
      });

      await service.submit(integration, DEFAULT_FIRST_MESSAGE);

      expect(request.called).to.equal(false);
    });

    it('sends an edit under the next name and keeps using the approved one meanwhile', async () => {
      const { service, integration } = setup({
        agentInboxWhatsappTemplateName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateStatus: 'APPROVED',
        agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        agentInboxWhatsappTemplateApprovedName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateApprovedBody: DEFAULT_FIRST_MESSAGE,
      });
      request.resolves({ statusCode: 200, body: { id: 'tpl2', status: 'PENDING' } });

      const state = await service.submit(integration, 'New text from {{agent_name}} for you.');

      expect(request.firstCall.args[0].body.name).to.equal('agentinbox_first_message_2');
      expect(state.approved).to.deep.equal({ name: 'agentinbox_first_message', body: DEFAULT_FIRST_MESSAGE });
    });

    it('adopts a template Meta already has under that name', async () => {
      const { service, integration } = setup({});
      request.onFirstCall().resolves({ statusCode: 400, body: { error: { code: 100, message: 'already exists' } } });
      request.onSecondCall().resolves({
        statusCode: 200,
        body: {
          data: [
            {
              id: 'tpl1',
              name: 'agentinbox_first_message',
              status: 'APPROVED',
              language: 'en',
              components: [
                { type: 'BODY', text: DEFAULT_FIRST_MESSAGE },
                { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'View message' }] },
              ],
            },
          ],
        },
      });

      const state = await service.submit(integration, DEFAULT_FIRST_MESSAGE);

      expect(state.status).to.equal('APPROVED');
      expect(state.approved?.name).to.equal('agentinbox_first_message');
    });

    for (const [why, template] of [
      ['in another language', { language: 'es', buttons: [{ type: 'QUICK_REPLY', text: 'View message' }] }],
      ['without a quick-reply button', { language: 'en', buttons: [] }],
      ['with a link for its first button', { language: 'en', buttons: [{ type: 'URL', text: 'Open' }] }],
    ] as const) {
      it(`takes the next name when Meta has this one with the same words but ${why}`, async () => {
        const { service, integration } = setup({});
        request.onCall(0).resolves({ statusCode: 400, body: { error: { code: 100, message: 'already exists' } } });
        request.onCall(1).resolves({
          statusCode: 200,
          body: {
            data: [
              {
                id: 'tpl1',
                name: 'agentinbox_first_message',
                status: 'APPROVED',
                language: template.language,
                components: [
                  { type: 'BODY', text: DEFAULT_FIRST_MESSAGE },
                  { type: 'BUTTONS', buttons: template.buttons },
                ],
              },
            ],
          },
        });
        request.onCall(2).resolves({ statusCode: 200, body: { id: 'tpl2', status: 'PENDING' } });

        await service.submit(integration, DEFAULT_FIRST_MESSAGE);

        expect(request.getCall(2).args[0].body.name).to.equal('agentinbox_first_message_2');
      });
    }

    it('takes the next name when Meta already has this one with other words', async () => {
      const { service, integration } = setup({});
      request.onCall(0).resolves({ statusCode: 400, body: { error: { code: 100, message: 'already exists' } } });
      request.onCall(1).resolves({
        statusCode: 200,
        body: {
          data: [
            {
              id: 'tpl1',
              name: 'agentinbox_first_message',
              status: 'PENDING',
              components: [{ type: 'BODY', text: 'Other words from {{agent_name}} here.' }],
            },
          ],
        },
      });
      request.onCall(2).resolves({ statusCode: 200, body: { id: 'tpl2', status: 'PENDING' } });

      const state = await service.submit(integration, DEFAULT_FIRST_MESSAGE);

      expect(request.getCall(2).args[0].body.name).to.equal('agentinbox_first_message_2');
      expect(state).to.deep.equal({ status: 'PENDING', body: DEFAULT_FIRST_MESSAGE });
    });

    it('sends a message without the agent’s name without an example', async () => {
      const { service, integration } = setup({});
      request.resolves({ statusCode: 200, body: { id: 'tpl1', status: 'PENDING' } });

      await service.submit(integration, 'You have a new message. Reply here to read it.');

      expect(request.firstCall.args[0].body.components[0]).to.deep.equal({
        type: 'BODY',
        text: 'You have a new message. Reply here to read it.',
      });
    });

    it('passes on what Meta refused', async () => {
      const { service, integration } = setup({});
      request.resolves({ statusCode: 400, body: { error: { code: 200, message: 'Permissions error' } } });

      const error = await service.submit(integration, DEFAULT_FIRST_MESSAGE).catch((err: unknown) => err);

      expect(error).to.be.instanceOf(FirstMessageSubmitError);
      expect((error as FirstMessageSubmitError).meta.code).to.equal(200);
    });

    it('reads a pending review from Meta again and keeps the approval', async () => {
      const { service, integration, integrationRepository } = setup({
        agentInboxWhatsappTemplateName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateStatus: 'PENDING',
        agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        agentInboxWhatsappTemplateCheckedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      });
      request.resolves({
        statusCode: 200,
        body: {
          data: [
            { id: 'tpl9', name: 'agentinbox_first_message_2', status: 'PENDING' },
            { id: 'tpl1', name: 'agentinbox_first_message', status: 'APPROVED', rejected_reason: 'NONE' },
          ],
        },
      });

      const state = await service.read(integration);

      expect(state).to.deep.equal({
        status: 'APPROVED',
        body: DEFAULT_FIRST_MESSAGE,
        approved: { name: 'agentinbox_first_message', body: DEFAULT_FIRST_MESSAGE },
      });
      const statusSave = integrationRepository.update.lastCall.args;
      expect(statusSave[0]).to.include({ 'credentials.agentInboxWhatsappTemplateName': 'agentinbox_first_message' });
      expect(statusSave[1].$set).to.include({
        'credentials.agentInboxWhatsappTemplateApprovedName': 'agentinbox_first_message',
      });
    });

    it('does not ask Meta again within a minute, or once the review is over', async () => {
      const recent = setup({
        agentInboxWhatsappTemplateName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateStatus: 'PENDING',
        agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        agentInboxWhatsappTemplateCheckedAt: new Date().toISOString(),
      });
      const rejected = setup({
        agentInboxWhatsappTemplateName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateStatus: 'REJECTED',
        agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        agentInboxWhatsappTemplateRejectedReason: 'INVALID_FORMAT',
      });

      expect((await recent.service.read(recent.integration))?.status).to.equal('PENDING');
      expect(await rejected.service.read(rejected.integration)).to.deep.equal({
        status: 'REJECTED',
        body: DEFAULT_FIRST_MESSAGE,
        rejectedReason: 'INVALID_FORMAT',
      });
      expect(request.called).to.equal(false);
    });

    describe('an approved template Meta stops afterwards', () => {
      const approved = {
        agentInboxWhatsappTemplateName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateStatus: 'APPROVED',
        agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        agentInboxWhatsappTemplateApprovedName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateApprovedBody: DEFAULT_FIRST_MESSAGE,
      };
      const metaSays = (status: string) => ({
        statusCode: 200,
        body: { data: [{ id: 'tpl1', name: 'agentinbox_first_message', status }] },
      });

      it('stops being used once Meta pauses it, and shows where it stands', async () => {
        const { service, integration, integrationRepository } = setup(approved);
        request.resolves(metaSays('PAUSED'));

        expect(await service.read(integration)).to.deep.equal({ status: 'PAUSED', body: DEFAULT_FIRST_MESSAGE });

        const [where, change] = integrationRepository.update.lastCall.args;
        expect(where).to.include({ _environmentId: 'env1', _organizationId: 'org1' });
        expect(where['credentials.agentInboxWhatsappTemplateApprovedName']).to.equal('agentinbox_first_message');
        // Guarded by the latest submission too, so an edit sent for review meanwhile never takes this status.
        expect(where['credentials.agentInboxWhatsappTemplateName']).to.equal('agentinbox_first_message');
        expect(change.$set).to.deep.equal({
          'credentials.agentInboxWhatsappTemplateApprovedName': '',
          'credentials.agentInboxWhatsappTemplateApprovedBody': '',
          'credentials.agentInboxWhatsappTemplateStatus': 'PAUSED',
        });
      });

      it('keeps one Meta still approves, and one Meta’s answer says nothing about', async () => {
        const still = setup(approved);
        request.resolves(metaSays('APPROVED'));
        expect((await still.service.read(still.integration))?.approved?.name).to.equal('agentinbox_first_message');

        const silent = setup(approved);
        request.resolves({ statusCode: 200, body: { data: [] } });
        expect((await silent.service.read(silent.integration))?.approved?.name).to.equal('agentinbox_first_message');
      });

      it('is used again once Meta lifts the pause', async () => {
        const { service, integration, integrationRepository } = setup({
          agentInboxWhatsappTemplateName: 'agentinbox_first_message',
          agentInboxWhatsappTemplateStatus: 'PAUSED',
          agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
          agentInboxWhatsappTemplateCheckedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
        });
        request.resolves(metaSays('APPROVED'));

        expect(await service.read(integration)).to.deep.equal({
          status: 'APPROVED',
          body: DEFAULT_FIRST_MESSAGE,
          approved: { name: 'agentinbox_first_message', body: DEFAULT_FIRST_MESSAGE },
        });
        expect(integrationRepository.update.lastCall.args[1].$set).to.include({
          'credentials.agentInboxWhatsappTemplateStatus': 'APPROVED',
          'credentials.agentInboxWhatsappTemplateApprovedName': 'agentinbox_first_message',
        });
      });

      it('reads a pause again at most once a quarter of an hour, and never a disabled one', async () => {
        const paused = setup({
          agentInboxWhatsappTemplateName: 'agentinbox_first_message',
          agentInboxWhatsappTemplateStatus: 'PAUSED',
          agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
          agentInboxWhatsappTemplateCheckedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        });
        const disabled = setup({
          agentInboxWhatsappTemplateName: 'agentinbox_first_message',
          agentInboxWhatsappTemplateStatus: 'DISABLED',
          agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        });

        expect((await paused.service.read(paused.integration))?.status).to.equal('PAUSED');
        expect((await disabled.service.read(disabled.integration))?.status).to.equal('DISABLED');
        expect(request.called).to.equal(false);
      });

      it('leaves an older approval alone while a newer edit is the latest submission', async () => {
        const { service, integration, integrationRepository } = setup({
          ...approved,
          agentInboxWhatsappTemplateName: 'agentinbox_first_message_2',
          agentInboxWhatsappTemplateStatus: 'REJECTED',
          agentInboxWhatsappTemplateBody: 'New words from {{agent_name}} here.',
        });

        expect((await service.read(integration))?.approved?.name).to.equal('agentinbox_first_message');
        expect(request.called).to.equal(false);
        expect(integrationRepository.update.called).to.equal(false);
      });

      it('asks Meta at most once a quarter of an hour', async () => {
        const { service, integration } = setup({
          ...approved,
          agentInboxWhatsappTemplateCheckedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        });

        expect((await service.read(integration))?.status).to.equal('APPROVED');
        expect(request.called).to.equal(false);
      });
    });

    it('keeps the stored status when Meta can’t be read', async () => {
      const { service, integration } = setup({
        agentInboxWhatsappTemplateName: 'agentinbox_first_message',
        agentInboxWhatsappTemplateStatus: 'PENDING',
        agentInboxWhatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
      });
      request.rejects(new Error('timeout'));

      expect((await service.read(integration))?.status).to.equal('PENDING');
    });
  });
});
