import { expect } from 'chai';
import sinon from 'sinon';
import { HumanRelayEmailService } from './human-relay-email.service';

const scope = {
  environmentId: 'env-1',
  organizationId: 'org-1',
  agentId: 'agent-1',
  recipientAddress: 'maya@acme.co',
};

function setUp(
  options: { agent?: unknown; operatorId?: string | null; contacts?: unknown[]; people?: unknown[] } = {}
) {
  const agents = {
    findOne: sinon.stub().resolves('agent' in options ? options.agent : { _id: 'agent-1', name: 'Atlas' }),
  };
  const subscribers = {
    find: sinon.stub().resolves(
      options.people ?? [
        { subscriberId: 'op', firstName: 'Dima', lastName: 'Grossman' },
        { subscriberId: 'maya', firstName: 'Maya', lastName: 'Levi' },
      ]
    ),
  };
  const contacts = {
    findContactsByEmailAddress: sinon.stub().resolves(options.contacts ?? [{ subscriberId: 'maya' }]),
  };
  const operators = {
    findForAgent: sinon.stub().resolves('operatorId' in options ? options.operatorId : 'op'),
  };

  return new HumanRelayEmailService(agents as never, subscribers as never, contacts as never, operators as never);
}

describe('HumanRelayEmailService', () => {
  const original = process.env.HUMAN_DASHBOARD_URL;

  beforeEach(() => {
    process.env.HUMAN_DASHBOARD_URL = 'https://agentinbox.md';
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.HUMAN_DASHBOARD_URL;
    } else {
      process.env.HUMAN_DASHBOARD_URL = original;
    }
  });

  it('names the agent, who runs it and who the email is for', async () => {
    const parties = await setUp().findParties(scope);

    expect(parties.sender).to.deep.equal({
      agentName: 'Atlas',
      operatorName: 'Dima Grossman',
      pictureUrl: 'https://agentinbox.md/brand/agent-avatar.png',
    });
    expect(parties.recipient).to.deep.equal({ name: 'Maya Levi', firstName: 'Maya' });
  });

  it('uses the picture of an agent that has one', async () => {
    const service = setUp({
      agent: { _id: 'agent-1', _environmentId: 'env-1', name: 'Atlas', picture: { storageKey: 'k', version: 'v1' } },
    });

    const { sender } = await service.findParties(scope);

    expect(sender.pictureUrl).to.equal('https://agentinbox.md/api/v1/agent-pictures/env-1/agent-1/v1');
  });

  it('leaves out the placeholder name', async () => {
    const { sender } = await setUp({ agent: { _id: 'agent-1', name: 'Agent' } }).findParties(scope);

    expect(sender).to.not.have.property('agentName');
  });

  it('has no names for a typed address that is nobody’s contact', async () => {
    const service = setUp({ operatorId: null, contacts: [], people: [] });

    const { sender, recipient } = await service.findParties(scope);

    expect(sender).to.not.have.property('operatorName');
    expect(recipient).to.deep.equal({});
  });
});
