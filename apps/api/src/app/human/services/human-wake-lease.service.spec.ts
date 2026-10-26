import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AgentRepository, type WakeHostId } from '@novu/dal';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import { Types } from 'mongoose';
import { AGENT_PAUSED } from '../../agents/human-relay/agent-paused.error';
import {
  AWAKE_ELSEWHERE,
  AWAKE_LEASE_SECONDS,
  AWAKE_RENEW_SECONDS,
  HumanWakeLeaseService,
  liveAwake,
  NOT_AWAKE,
} from './human-wake-lease.service';

/**
 * The lease rules, against the test database: what decides who holds the lease is one conditional write there,
 * so that is where two computers asking at once are tried.
 */
describe('HumanWakeLeaseService', () => {
  const agentRepository = new AgentRepository();
  const service = new HumanWakeLeaseService(agentRepository);

  const macbook = {
    computerId: 'macbook-0123456789abcdef',
    computerName: 'MacBook',
    host: 'claude-code' as WakeHostId,
    project: '~/projects/app',
  };
  const studio = { computerId: 'studio-0123456789abcdef', computerName: 'Studio', host: 'codex' as WakeHostId };

  let scope: { environmentId: string; organizationId: string };
  let agent: { _id: string; identifier: string; name: string };

  beforeEach(async () => {
    scope = { environmentId: new Types.ObjectId().toString(), organizationId: new Types.ObjectId().toString() };
    const created = await agentRepository.create({
      name: 'Atlas',
      identifier: 'human-relay',
      runtime: 'human_relay',
      behavior: { subscriberAccess: AgentSubscriberAccessEnum.OPEN },
      _environmentId: scope.environmentId,
      _organizationId: scope.organizationId,
    });
    agent = { _id: created._id, identifier: created.identifier, name: created.name };
  });

  async function storeAwake(fields: Record<string, unknown>) {
    await agentRepository.update(
      { _id: agent._id, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
      { $set: Object.fromEntries(Object.entries(fields).map(([key, value]) => [`awake.${key}`, value])) },
      { timestamps: false }
    );
  }

  async function refusal(promise: Promise<unknown>): Promise<Record<string, any>> {
    const error = await promise.then(
      () => null,
      (caught: unknown) => caught
    );
    expect(error, 'expected a refusal').to.be.instanceOf(Error);

    return {
      status: (error as ConflictException).getStatus(),
      ...((error as ConflictException).getResponse() as object),
    };
  }

  it('takes a free lease for three minutes, and tells the computer to renew it every minute', async () => {
    const lease = await service.take(scope, agent, macbook, false);

    expect(lease.renewInSeconds).to.equal(AWAKE_RENEW_SECONDS);
    expect(lease.awake).to.include({ ...macbook, since: lease.awake.renewedAt });
    expect(Date.parse(lease.awake.expiresAt) - Date.parse(lease.awake.renewedAt)).to.equal(AWAKE_LEASE_SECONDS * 1000);
    expect(await service.current(scope, agent)).to.deep.equal(lease.awake);
  });

  it('renews it for the computer and host that hold it, keeping since, in the project it runs in now', async () => {
    const first = await service.take(scope, agent, macbook, false);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const renewed = await service.take(scope, agent, { ...macbook, project: '~/projects/api' }, false);

    expect(renewed.awake.since).to.equal(first.awake.since);
    expect(renewed.awake.renewedAt > first.awake.renewedAt).to.equal(true);
    expect(renewed.awake).to.include({ host: 'claude-code', project: '~/projects/api' });
  });

  it('counts the same computer waking another host as another holder', async () => {
    const held = await service.take(scope, agent, macbook, false);
    const codexHere = { ...macbook, host: 'codex' as WakeHostId };

    expect(await refusal(service.take(scope, agent, codexHere, false))).to.deep.include({
      status: 409,
      code: AWAKE_ELSEWHERE,
      awake: held.awake,
    });
    expect(await refusal(service.assertHolds(scope, agent, codexHere))).to.deep.include({
      code: NOT_AWAKE,
      awake: held.awake,
    });
    expect(await service.release(scope, agent, codexHere)).to.equal(false);

    await new Promise((resolve) => setTimeout(resolve, 10));
    const taken = await service.take(scope, agent, codexHere, true);
    expect(taken.awake).to.include({ computerId: macbook.computerId, host: 'codex' });
    expect(taken.awake.since > held.awake.since).to.equal(true);
    expect(await refusal(service.assertHolds(scope, agent, macbook))).to.deep.include({ code: NOT_AWAKE });
  });

  it('refuses another computer while the lease is live, naming the computer that holds it', async () => {
    const held = await service.take(scope, agent, macbook, false);

    const refused = await refusal(service.take(scope, agent, studio, false));

    expect(refused).to.deep.include({ status: 409, code: AWAKE_ELSEWHERE, awake: held.awake });
    expect(await service.current(scope, agent)).to.deep.equal(held.awake);
  });

  it('hands it to a computer that takes it over, which starts it anew, and the old holder learns at its next call', async () => {
    const held = await service.take(scope, agent, macbook, false);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const taken = await service.take(scope, agent, studio, true);

    expect(taken.awake).to.include(studio);
    expect(taken.awake.since > held.awake.since).to.equal(true);
    // Nothing of the computer it was taken from stays behind.
    expect(taken.awake).to.not.have.property('project');

    expect(await refusal(service.assertHolds(scope, agent, macbook))).to.deep.include({
      status: 409,
      code: NOT_AWAKE,
      awake: taken.awake,
    });
    expect(await refusal(service.take(scope, agent, macbook, false))).to.deep.include({
      code: AWAKE_ELSEWHERE,
      awake: taken.awake,
    });
  });

  it('counts a lapsed lease as none: another computer takes it without taking over, and the old holder may not wait', async () => {
    await service.take(scope, agent, macbook, false);
    await storeAwake({ expiresAt: new Date(Date.now() - 1000).toISOString() });

    expect(await service.current(scope, agent)).to.equal(null);
    expect(await refusal(service.assertHolds(scope, agent, macbook))).to.deep.include({
      code: NOT_AWAKE,
      awake: null,
    });

    const taken = await service.take(scope, agent, studio, false);
    expect(taken.awake.computerId).to.equal(studio.computerId);
  });

  it('starts it anew for a computer that takes back the lease it let lapse', async () => {
    const held = await service.take(scope, agent, macbook, false);
    await storeAwake({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const again = await service.take(scope, agent, macbook, false);

    expect(again.awake.since > held.awake.since).to.equal(true);
  });

  it('lets only one of many computers asking at once have it', async () => {
    const computers = Array.from({ length: 12 }, (_, index) => ({
      computerId: `racer-${String(index).padStart(2, '0')}-0123456789abc`,
      computerName: `Racer ${index}`,
      host: 'claude-code' as WakeHostId,
    }));

    const results = await Promise.allSettled(computers.map((computer) => service.take(scope, agent, computer, false)));

    const won = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    expect(won).to.have.length(1);
    const holder = await service.current(scope, agent);
    expect(holder?.computerId).to.equal(won[0].awake.computerId);

    for (const result of results) {
      if (result.status === 'rejected') {
        expect((result.reason as ConflictException).getResponse()).to.deep.include({
          code: AWAKE_ELSEWHERE,
          awake: holder,
        });
      }
    }
  });

  it('lets only one host have it when one computer asks for several at once', async () => {
    const hosts: WakeHostId[] = ['claude-code', 'codex', 'opencode', 'cursor', 'hermes', 'openclaw'];

    const results = await Promise.allSettled(
      hosts.map((host) => service.take(scope, agent, { ...macbook, host }, false))
    );

    const won = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    expect(won).to.have.length(1);
    expect((await service.current(scope, agent))?.host).to.equal(won[0].awake.host);
  });

  it('lets go of the lease only for the computer and host that hold it', async () => {
    const held = await service.take(scope, agent, macbook, false);

    expect(await service.release(scope, agent, studio)).to.equal(false);
    expect(await service.current(scope, agent)).to.deep.equal(held.awake);

    expect(await service.release(scope, agent, macbook)).to.equal(true);
    expect(await service.current(scope, agent)).to.equal(null);
    expect(await service.release(scope, agent, macbook)).to.equal(false);

    // Free again: the next computer takes it without taking over.
    expect((await service.take(scope, agent, studio, false)).awake.computerId).to.equal(studio.computerId);
  });

  it('says a lapsed lease was not let go', async () => {
    await service.take(scope, agent, macbook, false);
    await storeAwake({ expiresAt: new Date(Date.now() - 1000).toISOString() });

    expect(await service.release(scope, agent, macbook)).to.equal(false);
  });

  it('keeps the lease of another account’s agent apart', async () => {
    await service.take(scope, agent, macbook, false);
    const otherScope = { environmentId: new Types.ObjectId().toString(), organizationId: scope.organizationId };

    // The same agent id under another environment is no agent at all.
    expect(await service.current(otherScope, agent)).to.equal(null);
    expect(await service.release(otherScope, agent, macbook)).to.equal(false);
    expect((await service.current(scope, agent))?.computerId).to.equal(macbook.computerId);
  });

  it('stores what a computer sends as it is, never reading it as a field of the agent', async () => {
    const lease = await service.take(scope, agent, { ...macbook, computerName: '$name', project: '$$ROOT' }, false);

    expect(lease.awake).to.include({ computerName: '$name', project: '$$ROOT' });
  });

  it('stops a wait once the agent is paused', async () => {
    await service.take(scope, agent, macbook, false);
    await agentRepository.update(
      { _id: agent._id, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
      { $set: { pausedAt: new Date().toISOString() } }
    );

    const error = await service.assertHolds(scope, agent, macbook).catch((caught: unknown) => caught);

    expect(error).to.be.instanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).to.include({ code: AGENT_PAUSED });
  });

  it('says where the agent is awake and whether it is paused, in one look', async () => {
    const held = await service.take(scope, agent, macbook, false);
    expect(await service.status(scope, agent)).to.deep.equal({ awake: held.awake, paused: false });

    await agentRepository.update(
      { _id: agent._id, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
      { $set: { pausedAt: new Date().toISOString() } }
    );

    expect(await service.status(scope, agent)).to.deep.equal({ awake: held.awake, paused: true });
  });

  describe('liveAwake', () => {
    const awake = {
      ...macbook,
      since: '2026-10-24T10:00:00.000Z',
      renewedAt: '2026-10-24T10:01:00.000Z',
      expiresAt: '2026-10-24T10:04:00.000Z',
    };

    it('describes a live lease, and none once it lapsed', () => {
      expect(liveAwake(awake, new Date('2026-10-24T10:03:59.000Z'))).to.deep.equal(awake);
      expect(liveAwake(awake, new Date('2026-10-24T10:04:00.000Z'))).to.equal(null);
      expect(liveAwake(undefined, new Date())).to.equal(null);
    });
  });
});
