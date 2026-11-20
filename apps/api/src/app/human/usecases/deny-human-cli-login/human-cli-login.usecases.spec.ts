import { ConflictException, NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { CliDeviceSessionBeingApprovedError } from '../../../cli-auth/services/cli-device-session.service';
import {
  CLI_LOGIN_BEING_APPROVED_CODE,
  CLI_LOGIN_NOT_FOUND_CODE,
} from '../approve-human-cli-login/approve-human-cli-login.usecase';
import { GetHumanCliLogin } from '../get-human-cli-login/get-human-cli-login.usecase';
import { HumanCliLoginCommand } from '../get-human-cli-login/human-cli-login.command';
import { DenyHumanCliLogin } from './deny-human-cli-login.usecase';

describe('Human CLI login lookup and denial', () => {
  const command = () => HumanCliLoginCommand.create({ userCode: 'BCDF-GHJK' });

  it('only accepts codes in the shape the CLI prints', () => {
    expect(() => HumanCliLoginCommand.create({ userCode: 'bcdf-ghjk' })).to.throw();
    expect(() => HumanCliLoginCommand.create({ userCode: '<script>' })).to.throw();
  });

  describe('GetHumanCliLogin', () => {
    it('returns the computer the login waits on', async () => {
      const sessions = {
        getPendingByUserCode: sinon.stub().resolves({ deviceCode: 'device_code', machineName: 'adas-macbook-pro' }),
      };

      const result = await new GetHumanCliLogin(sessions as never).execute(command());

      // The device code stays on the server: the page only ever works with the user code.
      expect(result).to.deep.equal({ userCode: 'BCDF-GHJK', machineName: 'adas-macbook-pro' });
      expect(sessions.getPendingByUserCode.firstCall.args[0]).to.equal('BCDF-GHJK');
    });

    it('leaves the machine name out when the CLI sent none', async () => {
      const sessions = { getPendingByUserCode: sinon.stub().resolves({ deviceCode: 'device_code' }) };

      expect(await new GetHumanCliLogin(sessions as never).execute(command())).to.deep.equal({
        userCode: 'BCDF-GHJK',
      });
    });

    it('answers 404 with the login code once nothing waits for the code', async () => {
      const sessions = { getPendingByUserCode: sinon.stub().resolves(null) };

      const error = await new GetHumanCliLogin(sessions as never).execute(command()).catch((caught) => caught);

      expect(error).to.be.instanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).to.deep.include({ code: CLI_LOGIN_NOT_FOUND_CODE });
    });
  });

  describe('DenyHumanCliLogin', () => {
    it('ends the login waiting for the code', async () => {
      const sessions = { denyByUserCode: sinon.stub().resolves(true) };

      expect(await new DenyHumanCliLogin(sessions as never).execute(command())).to.deep.equal({ denied: true });
      expect(sessions.denyByUserCode.firstCall.args[0]).to.equal('BCDF-GHJK');
    });

    it('is not an error when the login is already gone, but says nothing was denied', async () => {
      const sessions = { denyByUserCode: sinon.stub().resolves(false) };

      expect(await new DenyHumanCliLogin(sessions as never).execute(command())).to.deep.equal({ denied: false });
    });

    it('answers 409 while the login is being approved, since that approval may still let the CLI in', async () => {
      const sessions = { denyByUserCode: sinon.stub().rejects(new CliDeviceSessionBeingApprovedError()) };

      const error = await new DenyHumanCliLogin(sessions as never).execute(command()).catch((caught) => caught);

      expect(error).to.be.instanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).to.deep.include({ code: CLI_LOGIN_BEING_APPROVED_CODE });
    });
  });
});
