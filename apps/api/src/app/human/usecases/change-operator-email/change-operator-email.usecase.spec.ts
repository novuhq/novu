import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChangeOperatorEmailCommand } from './change-operator-email.command';
import { ChangeOperatorEmail } from './change-operator-email.usecase';

describe('ChangeOperatorEmail', () => {
  const sent = {
    address: 'n***@example.com',
    requestedAt: '2026-10-15T10:00:00.000Z',
    expiresAt: '2026-10-16T10:00:00.000Z',
    retryAfterSeconds: 60,
    replacesVerifiedAddress: true,
  };

  function setup(verifiedAddress?: string) {
    const humanOperator = { require: sinon.stub().resolves({ agentId: 'relay1', subscriberId: 'dima' }) };
    const humanContactRepository = {
      findVerifiedAddress: sinon.stub().resolves(
        verifiedAddress
          ? {
              address: verifiedAddress,
              requestedAt: '2026-10-01T00:00:00.000Z',
              verifiedAt: '2026-10-01T00:05:00.000Z',
            }
          : null
      ),
    };
    const requestAddressVerification = { execute: sinon.stub().resolves(sent) };
    const usecase = new ChangeOperatorEmail(
      humanOperator as never,
      humanContactRepository as never,
      requestAddressVerification as never
    );

    return { usecase, humanOperator, humanContactRepository, requestAddressVerification };
  }

  function command(address: string, agentIdentifier?: string) {
    return ChangeOperatorEmailCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      address,
      ...(agentIdentifier ? { agentIdentifier } : {}),
    });
  }

  it("sends the confirmation link for the operator's relay without setting anything up", async () => {
    const { usecase, humanOperator, humanContactRepository, requestAddressVerification } = setup('old@example.com');

    expect(await usecase.execute(command('  New@Example.com '))).to.deep.equal(sent);

    expect(humanOperator.require.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentIdentifier: 'human-relay',
    });
    expect(humanContactRepository.findVerifiedAddress.firstCall.args).to.deep.equal([
      'env1',
      'relay1',
      'dima',
      HumanChannelViaEnum.EMAIL,
    ]);
    // An agent id skips setup, so the default channel isn't touched.
    expect(requestAddressVerification.execute.firstCall.args[0]).to.deep.include({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      agentId: 'relay1',
      subscriberId: 'dima',
      via: HumanChannelViaEnum.EMAIL,
      address: 'new@example.com',
    });
    expect(requestAddressVerification.execute.firstCall.args[0]).to.not.have.property('setDefaultVia');
  });

  it('confirms an address that was never verified, such as the one the operator signed up with', async () => {
    const { usecase, humanOperator, requestAddressVerification } = setup();

    await usecase.execute(command('dima@example.com', 'second-relay'));

    expect(humanOperator.require.firstCall.args[0]).to.include({ agentIdentifier: 'second-relay' });
    expect(requestAddressVerification.execute.firstCall.args[0]).to.deep.include({
      address: 'dima@example.com',
      agentId: 'relay1',
    });
  });

  it('refuses the address that is already verified', async () => {
    const { usecase, requestAddressVerification } = setup('dima@example.com');

    const err = await usecase.execute(command('Dima@Example.com')).catch((error) => error);

    expect(err).to.be.instanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).to.include({ code: 'address_already_verified' });
    expect(requestAddressVerification.execute.called).to.equal(false);
  });

  it('refuses something that is not an email address before looking anything up', async () => {
    const { usecase, humanOperator, requestAddressVerification } = setup();

    const err = await usecase.execute(command('not-an-address')).catch((error) => error);

    expect(err).to.be.instanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).to.include({ code: 'address_invalid' });
    expect(humanOperator.require.called).to.equal(false);
    expect(requestAddressVerification.execute.called).to.equal(false);
  });

  it('passes on a missing agent or operator without sending anything', async () => {
    const { usecase, humanOperator, requestAddressVerification } = setup();
    humanOperator.require.rejects(new NotFoundException({ code: 'agent_not_found', message: 'nope' }));

    const err = await usecase.execute(command('new@example.com')).catch((error) => error);

    expect(err).to.be.instanceOf(NotFoundException);
    expect(requestAddressVerification.execute.called).to.equal(false);
  });
});
