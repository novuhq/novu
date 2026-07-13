import child_process from 'node:child_process';
import { expect } from 'chai';
import sinon from 'sinon';

const mailUtilities = require('./mailUtilities');

/**
 * verifyspf.py communicates its verdict through exit codes
 * (0 pass, 11 fail/softfail, 12 none/neutral, 13 temperror, 14 permerror).
 * These tests pin the Node-side contract: only exit 0 yields spf=pass, and
 * undefined args are sanitized so execFile never stringifies them to
 * "undefined".
 */
describe('mailUtilities.validateSpf', () => {
  let execFileStub: sinon.SinonStub;

  beforeEach(() => {
    execFileStub = sinon.stub(child_process, 'execFile');
  });

  afterEach(() => {
    execFileStub.restore();
  });

  function stubSpfExit(code: number | string) {
    execFileStub.callsFake((_bin, _args, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
      const err = code === 0 ? null : Object.assign(new Error('Command failed'), { code });
      callback(err, '[verifyspf.py] (stubbed, )', '');
    });
  }

  function validateSpf(ip?: string, address?: string, host?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      mailUtilities.validateSpf(ip, address, host, (err: Error | null, isValid: boolean) =>
        err ? reject(err) : resolve(isValid)
      );
    });
  }

  it('should resolve spf=pass only for exit code 0', async () => {
    stubSpfExit(0);

    expect(await validateSpf('209.85.220.41', 'someone@gmail.com', 'mail-sor-f41.google.com')).to.equal(true);
  });

  [11, 12, 13, 14, 64, 1].forEach((exitCode) => {
    it(`should resolve spf=failed for exit code ${exitCode}`, async () => {
      stubSpfExit(exitCode);

      expect(await validateSpf('8.8.8.8', 'someone@gmail.com', 'gmail.com')).to.equal(false);
    });
  });

  it('should resolve spf=failed for string spawn error codes like ENOENT', async () => {
    stubSpfExit('ENOENT');

    expect(await validateSpf('8.8.8.8', 'someone@gmail.com', 'gmail.com')).to.equal(false);
  });

  it('should pass empty strings instead of undefined args so python never receives the literal "undefined"', async () => {
    stubSpfExit(12);

    await validateSpf('10.0.10.137', undefined, undefined);

    const [, args] = execFileStub.firstCall.args;
    expect(args.slice(1)).to.deep.equal(['10.0.10.137', '', '']);
  });
});
