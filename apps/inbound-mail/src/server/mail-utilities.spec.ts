import child_process from 'node:child_process';
import { EventEmitter } from 'node:events';
import { expect } from 'chai';
import sinon from 'sinon';
import logger from './logger';

const mailUtilities = require('./mailUtilities');

/**
 * verifydkim.py prints one JSON line with a result per signature and exits 11
 * when none verifies. These tests pin how the Node side reads that: only exit
 * 0 yields dkim=pass, and a failure logs each signature's reason.
 */
describe('mailUtilities.validateDkim', () => {
  let spawnStub: sinon.SinonStub;
  let warnStub: sinon.SinonStub;

  beforeEach(() => {
    spawnStub = sinon.stub(child_process, 'spawn');
    warnStub = sinon.stub(logger, 'warn');
  });

  afterEach(() => {
    spawnStub.restore();
    warnStub.restore();
  });

  function stubDkimRun(code: number, stdout: string, stderr = '') {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: { write: sinon.stub(), end: sinon.stub() },
    });
    child.stdin.end.callsFake(() =>
      setImmediate(() => {
        if (stdout) child.stdout.emit('data', Buffer.from(stdout));
        if (stderr) child.stderr.emit('data', Buffer.from(stderr));
        child.emit('close', code);
      })
    );
    spawnStub.returns(child);

    return child;
  }

  type DkimVerdict = { isValid: boolean; domains: string[] };

  function validateDkim(rawEmail: Buffer | string): Promise<DkimVerdict> {
    return new Promise((resolve, reject) => {
      mailUtilities.validateDkim(rawEmail, (err: Error | null, verdict: DkimVerdict) =>
        err ? reject(err) : resolve(verdict)
      );
    });
  }

  it('should resolve dkim=pass with the signing domain for exit code 0', async () => {
    stubDkimRun(0, '{"signatures": [{"domain": "proton.me", "selector": "protonmail", "result": "pass"}]}\n');

    expect(await validateDkim(Buffer.from('raw email'))).to.deep.equal({ isValid: true, domains: ['proton.me'] });
    expect(warnStub.called).to.equal(false);
  });

  it('should list only the domains whose signatures verified', async () => {
    const signatures = [
      { domain: 'sendgrid.info', selector: 'smtpapi', result: 'fail', reason: 'KeyFormatError: missing public key' },
      { domain: 'novu.co', selector: 's1', result: 'pass' },
    ];
    stubDkimRun(0, `${JSON.stringify({ signatures })}\n`);

    expect(await validateDkim(Buffer.from('raw email'))).to.deep.equal({ isValid: true, domains: ['novu.co'] });
  });

  it('should write the raw email bytes to the verifier unchanged', async () => {
    const child = stubDkimRun(0, '{"signatures": []}\n');
    const rawEmail = Buffer.from('Subject: Gr\xfc\xdfe\r\n\r\n', 'latin1');

    await validateDkim(rawEmail);

    expect(child.stdin.write.firstCall.args[0]).to.equal(rawEmail);
  });

  it("should resolve dkim=failed for exit code 11 and log each signature's reason", async () => {
    const signatures = [
      { domain: 'sendgrid.info', selector: 'smtpapi', result: 'fail', reason: 'KeyFormatError: missing public key' },
      { domain: 'novu.co', selector: 's1', result: 'fail', reason: 'ValidationError: body hash mismatch' },
    ];
    stubDkimRun(11, `${JSON.stringify({ signatures })}\n`);

    expect(await validateDkim(Buffer.from('raw email'))).to.deep.equal({ isValid: false, domains: [] });

    const [payload, message] = warnStub.firstCall.args;
    expect(message).to.equal('DKIM verification failed: no signature verified.');
    expect(payload).to.include({ exitCode: 11 });
    expect(payload.signatures).to.deep.equal(signatures);
  });

  it('should say when the email has no DKIM signature at all', async () => {
    stubDkimRun(11, '{"signatures": []}\n');

    expect(await validateDkim(Buffer.from('raw email'))).to.deep.equal({ isValid: false, domains: [] });
    expect(warnStub.firstCall.args[1]).to.equal('DKIM verification failed: the email has no DKIM signature.');
  });

  [1, 11].forEach((exitCode) => {
    it(`should log exit code ${exitCode} without a report as a broken verifier, not a sender failure`, async () => {
      stubDkimRun(exitCode, '', 'Traceback (most recent call last): ...');

      expect(await validateDkim(Buffer.from('raw email'))).to.deep.equal({ isValid: false, domains: [] });

      const [payload, message] = warnStub.firstCall.args;
      expect(message).to.equal(
        'DKIM verification errored: verifier script did not run cleanly — treating dkim as failed.'
      );
      expect(payload).to.include({ exitCode, stderr: 'Traceback (most recent call last): ...' });
    });
  });
});

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
