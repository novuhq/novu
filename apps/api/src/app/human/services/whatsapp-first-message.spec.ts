import { encryptCredentials } from '@novu/application-generic';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  DEFAULT_FIRST_MESSAGE,
  fillFirstMessage,
  firstMessageProblem,
  nextFirstMessageName,
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
        'credentials.whatsappTemplateName': 'agentinbox_first_message',
        'credentials.whatsappTemplateId': 'tpl1',
        'credentials.whatsappTemplateStatus': 'PENDING',
      });
    });

    it('leaves the same body alone while it is under review', async () => {
      const { service, integration } = setup({
        whatsappTemplateName: 'agentinbox_first_message',
        whatsappTemplateStatus: 'PENDING',
        whatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
      });

      await service.submit(integration, DEFAULT_FIRST_MESSAGE);

      expect(request.called).to.equal(false);
    });

    it('sends an edit under the next name and keeps using the approved one meanwhile', async () => {
      const { service, integration } = setup({
        whatsappTemplateName: 'agentinbox_first_message',
        whatsappTemplateStatus: 'APPROVED',
        whatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        whatsappTemplateApprovedName: 'agentinbox_first_message',
        whatsappTemplateApprovedBody: DEFAULT_FIRST_MESSAGE,
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
              components: [{ type: 'BODY', text: DEFAULT_FIRST_MESSAGE }],
            },
          ],
        },
      });

      const state = await service.submit(integration, DEFAULT_FIRST_MESSAGE);

      expect(state.status).to.equal('APPROVED');
      expect(state.approved?.name).to.equal('agentinbox_first_message');
    });

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
        whatsappTemplateName: 'agentinbox_first_message',
        whatsappTemplateStatus: 'PENDING',
        whatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        whatsappTemplateCheckedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
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
      expect(statusSave[0]).to.include({ 'credentials.whatsappTemplateName': 'agentinbox_first_message' });
      expect(statusSave[1].$set).to.include({
        'credentials.whatsappTemplateApprovedName': 'agentinbox_first_message',
      });
    });

    it('does not ask Meta again within a minute, or once the review is over', async () => {
      const recent = setup({
        whatsappTemplateName: 'agentinbox_first_message',
        whatsappTemplateStatus: 'PENDING',
        whatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        whatsappTemplateCheckedAt: new Date().toISOString(),
      });
      const rejected = setup({
        whatsappTemplateName: 'agentinbox_first_message',
        whatsappTemplateStatus: 'REJECTED',
        whatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
        whatsappTemplateRejectedReason: 'INVALID_FORMAT',
      });

      expect((await recent.service.read(recent.integration))?.status).to.equal('PENDING');
      expect(await rejected.service.read(rejected.integration)).to.deep.equal({
        status: 'REJECTED',
        body: DEFAULT_FIRST_MESSAGE,
        rejectedReason: 'INVALID_FORMAT',
      });
      expect(request.called).to.equal(false);
    });

    it('keeps the stored status when Meta can’t be read', async () => {
      const { service, integration } = setup({
        whatsappTemplateName: 'agentinbox_first_message',
        whatsappTemplateStatus: 'PENDING',
        whatsappTemplateBody: DEFAULT_FIRST_MESSAGE,
      });
      request.rejects(new Error('timeout'));

      expect((await service.read(integration))?.status).to.equal('PENDING');
    });
  });
});
