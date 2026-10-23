import { expect } from 'chai';
import sinon from 'sinon';
import { describeHosts, HumanHostStatusService, readHostId } from './human-host-status.service';

describe('HumanHostStatusService', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1' };
  const agent = { _id: 'relay1', identifier: 'human-relay' };

  function setup(hosts?: Record<string, unknown>) {
    const agentRepository = {
      findOne: sinon.stub().resolves(hosts ? { hosts } : {}),
      update: sinon.stub().resolves({ matched: 1, modified: 1 }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanHostStatusService(agentRepository as never, logger as never);

    return { service, agentRepository, logger };
  }

  describe('describeHosts', () => {
    it('lists each host by name, last checked first, with the way it came in last', () => {
      const status = describeHosts({
        byId: {
          'claude-code': {
            connectedAt: '2026-10-20T10:00:00.000Z',
            lastCheckedAt: '2026-10-23T09:00:00.000Z',
            via: 'mcp',
          },
          codex: { connectedAt: '2026-10-21T10:00:00.000Z', lastCheckedAt: '2026-10-23T11:00:00.000Z', via: 'cli' },
          chatgpt: { connectedAt: '2026-10-22T10:00:00.000Z', via: 'mcp' },
        },
        firstCheckedAt: '2026-10-20T10:05:00.000Z',
      });

      expect(status.hosts).to.deep.equal([
        { id: 'codex', via: 'cli', connectedAt: '2026-10-21T10:00:00.000Z', lastCheckedAt: '2026-10-23T11:00:00.000Z' },
        {
          id: 'claude-code',
          via: 'mcp',
          connectedAt: '2026-10-20T10:00:00.000Z',
          lastCheckedAt: '2026-10-23T09:00:00.000Z',
        },
        { id: 'chatgpt', via: 'mcp', connectedAt: '2026-10-22T10:00:00.000Z', lastCheckedAt: null },
      ]);
      expect(status).to.include({
        connected: true,
        lastCheckedAt: '2026-10-23T11:00:00.000Z',
        lastCheckedVia: 'cli',
        lastCheckedHost: 'codex',
        firstCheckedAt: '2026-10-20T10:05:00.000Z',
      });
    });

    it('shows the hosts from before hosts had names as one General entry, with their times', () => {
      const status = describeHosts({
        cli: { connectedAt: '2026-10-01T10:00:00.000Z', lastCheckedAt: '2026-10-22T08:00:00.000Z' },
        mcp: { connectedAt: '2026-10-05T10:00:00.000Z', lastCheckedAt: '2026-10-22T09:00:00.000Z' },
      });

      expect(status.hosts).to.deep.equal([
        {
          id: 'general',
          via: 'mcp',
          connectedAt: '2026-10-01T10:00:00.000Z',
          lastCheckedAt: '2026-10-22T09:00:00.000Z',
        },
      ]);
      expect(status).to.include({
        connected: true,
        lastCheckedAt: '2026-10-22T09:00:00.000Z',
        lastCheckedHost: 'general',
      });
    });

    it('keeps the old entries while the named hosts have only connected, and lets them go once one checks', () => {
      const before = {
        cli: { connectedAt: '2026-10-01T10:00:00.000Z', lastCheckedAt: '2026-10-22T08:00:00.000Z' },
      };
      const connectedOnly = describeHosts({
        ...before,
        byId: { hermes: { connectedAt: '2026-10-23T10:00:00.000Z', via: 'cli' } },
      });

      expect(connectedOnly.hosts.map((host) => host.id)).to.deep.equal(['general', 'hermes']);
      expect(connectedOnly.lastCheckedAt).to.equal('2026-10-22T08:00:00.000Z');

      const checked = describeHosts({
        ...before,
        byId: {
          hermes: { connectedAt: '2026-10-23T10:00:00.000Z', lastCheckedAt: '2026-10-23T10:01:00.000Z', via: 'cli' },
        },
      });

      expect(checked.hosts.map((host) => host.id)).to.deep.equal(['hermes']);
      expect(checked.lastCheckedAt).to.equal('2026-10-23T10:01:00.000Z');
    });

    it('folds the old entries into a General host that is already there', () => {
      const status = describeHosts({
        cli: { connectedAt: '2026-10-01T10:00:00.000Z', lastCheckedAt: '2026-10-22T08:00:00.000Z' },
        byId: { general: { connectedAt: '2026-10-23T10:00:00.000Z', via: 'cli' } },
      });

      expect(status.hosts).to.deep.equal([
        {
          id: 'general',
          via: 'cli',
          connectedAt: '2026-10-01T10:00:00.000Z',
          lastCheckedAt: '2026-10-22T08:00:00.000Z',
        },
      ]);
    });

    it('says nothing is connected for an agent no host came to, and skips hosts this API does not know', () => {
      expect(describeHosts(undefined)).to.deep.equal({
        connected: false,
        lastCheckedAt: null,
        lastCheckedVia: null,
        lastCheckedHost: null,
        hosts: [],
        firstCheckedAt: null,
        waitingMessage: null,
      });
      expect(
        describeHosts({ byId: { windsurf: { connectedAt: '2026-10-23T10:00:00.000Z' } } as never }).hosts
      ).to.deep.equal([]);
    });
  });

  describe('readHostId', () => {
    it('takes a host Agent Inbox knows, in any case, and nothing else', () => {
      expect(readHostId(' Claude-Code ')).to.equal('claude-code');
      expect(readHostId('grok')).to.equal('grok');
      expect(readHostId('windsurf')).to.equal(undefined);
      expect(readHostId(['codex'])).to.equal(undefined);
      expect(readHostId(undefined)).to.equal(undefined);
    });
  });

  describe('recordConnected', () => {
    it('keeps when the host first connected, and the way it came in, under its own name', async () => {
      const { service, agentRepository } = setup();

      await service.recordConnected(scope, 'relay1', { via: 'cli', id: 'hermes' });

      const [query, update] = agentRepository.update.firstCall.args;
      expect(query).to.deep.equal({ _id: 'relay1', _environmentId: 'env1', _organizationId: 'org1' });
      expect(Object.keys(update.$min)).to.deep.equal(['hosts.byId.hermes.connectedAt']);
      expect(update.$set).to.deep.equal({ 'hosts.byId.hermes.via': 'cli' });
    });

    it('counts a host that did not say which one it is as General', async () => {
      const { service, agentRepository } = setup();

      await service.recordConnected(scope, 'relay1', { via: 'mcp' });

      expect(agentRepository.update.firstCall.args[1].$set).to.deep.equal({ 'hosts.byId.general.via': 'mcp' });
    });
  });

  describe('recordCheck', () => {
    it('writes the check under the host, once a minute at most for each host', async () => {
      const recent = new Date(Date.now() - 10_000).toISOString();
      const { service, agentRepository } = setup({
        firstCheckedAt: '2026-10-20T10:00:00.000Z',
        byId: { 'claude-code': { lastCheckedAt: recent, via: 'cli' } },
      });

      await service.recordCheck(scope, agent as never, { via: 'cli', id: 'claude-code' }, []);
      expect(agentRepository.update.called).to.equal(false);

      await service.recordCheck(scope, agent as never, { via: 'mcp', id: 'chatgpt' }, []);
      const [query, update] = agentRepository.update.firstCall.args;
      expect(query.$or[0]).to.deep.equal({ 'hosts.byId.chatgpt.lastCheckedAt': { $exists: false } });
      expect(Object.keys(update.$set)).to.deep.equal(['hosts.byId.chatgpt.lastCheckedAt', 'hosts.byId.chatgpt.via']);
      expect(update.$set['hosts.byId.chatgpt.via']).to.equal('mcp');
      expect(Object.keys(update.$min)).to.deep.equal(['hosts.byId.chatgpt.connectedAt']);
    });

    it('never fails the inbox it follows', async () => {
      const { service, agentRepository, logger } = setup();
      agentRepository.findOne.rejects(new Error('down'));

      await service.recordCheck(scope, agent as never, { via: 'cli' }, []);

      expect(logger.warn.calledOnce).to.equal(true);
    });
  });
});
