import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { CONNECT_CODE_INVALID } from '../../services/human-connect-code.service';
import { GetConnectCodeStatusCommand } from './get-connect-code-status.command';
import { GetConnectCodeStatus } from './get-connect-code-status.usecase';

describe('GetConnectCodeStatus', () => {
  const state = {
    code: 'BCDF-GHJK',
    status: 'used',
    expiresAt: '2026-10-15T10:10:00.000Z',
    usedAt: '2026-10-15T10:09:00.000Z',
  };

  function setup({
    described = state as object | null,
    environment = { apiKeys: [{ hash: 'h'.repeat(64) }] } as object | null,
  } = {}) {
    const inbox = { resolveRelayAgent: sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay' }) };
    const connectCodes = { describe: sinon.stub().resolves(described) };
    const environmentRepository = { findOne: sinon.stub().resolves(environment) };
    const usecase = new GetConnectCodeStatus(inbox as never, connectCodes as never, environmentRepository as never);

    return { usecase, inbox, connectCodes, environmentRepository };
  }

  function command(fields: Partial<GetConnectCodeStatusCommand> = {}) {
    return GetConnectCodeStatusCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      handle: 'atlas',
      code: 'bcdf-ghjk',
      ...fields,
    } as GetConnectCodeStatusCommand);
  }

  it('asks about the code as the caller’s relay agent, with the key its environment has now', async () => {
    const { usecase, inbox, connectCodes, environmentRepository } = setup();

    expect(await usecase.execute(command({ agentIdentifier: 'my-relay' }))).to.deep.equal(state);

    expect(inbox.resolveRelayAgent.firstCall.args).to.deep.equal([
      { environmentId: 'env1', organizationId: 'org1' },
      'my-relay',
    ]);
    expect(environmentRepository.findOne.firstCall.args).to.deep.equal([
      { _id: 'env1', _organizationId: 'org1' },
      'apiKeys',
    ]);
    expect(connectCodes.describe.firstCall.args).to.deep.equal([
      { environmentId: 'env1', organizationId: 'org1', agentId: 'relay1', keyFingerprint: 'h'.repeat(32) },
      'atlas',
      'bcdf-ghjk',
    ]);
  });

  it('is a 404 for a code that is not the agent’s, as for one never made', async () => {
    const { usecase } = setup({ described: null });

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect(error.getResponse()).to.include({ code: CONNECT_CODE_INVALID });
  });

  it('is a 404 when the relay agent is not set up, without looking for the code', async () => {
    const { usecase, inbox, connectCodes } = setup();
    inbox.resolveRelayAgent.rejects(new NotFoundException('Relay agent "human-relay" was not found.'));

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect(connectCodes.describe.called).to.equal(false);
  });

  it('is a 404 when the environment is gone', async () => {
    const { usecase, connectCodes } = setup({ environment: null });

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect(connectCodes.describe.called).to.equal(false);
  });
});
