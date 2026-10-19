import child_process from 'node:child_process';
import path from 'node:path';
import shell from 'shelljs';
import Spamc from 'spamc';
import logger from './logger';

const LOG_CONTEXT = 'MailUtilities';

/*
 * Verdict exit codes defined in verifyspf.py — keep in sync. Everything except
 * exit 0 resolves to spf=failed; this map only picks log levels and messages.
 * Codes outside the map — including string codes like ENOENT when the python
 * binary cannot be spawned — mean the check itself is broken, not the sender.
 */
const SPF_VERDICT_LOGS: Record<number, { level: 'warn' | 'info'; message: string }> = {
  11: { level: 'warn', message: 'SPF verification failed: sender IP is not authorized for the domain.' },
  12: {
    level: 'info',
    message: 'SPF verification returned no verdict: sender domain publishes no applicable SPF record.',
  },
  13: { level: 'warn', message: 'SPF verification hit a transient DNS error — treating spf as failed.' },
  14: { level: 'warn', message: 'SPF verification found an invalid SPF record — treating spf as failed.' },
};

const spamc = new Spamc();

/*
 * Resolve the Python interpreter once. Alpine images ship `python3` (via
 * py3-pip) without a `python` alias, so prefer python3 and keep the absolute
 * path to avoid any PATH/spawn ambiguity at request time.
 */
const resolvedPython = shell.which('python3') || shell.which('python');
const pythonBin = resolvedPython ? resolvedPython.toString() : null;
if (!pythonBin) {
  logger.warn(
    { context: LOG_CONTEXT, path: process.env.PATH },
    'Python is not available. Dkim and spf checking is disabled — every inbound email will carry dkim/spf "failed" verdicts.'
  );
} else {
  logger.info({ context: LOG_CONTEXT, pythonPath: pythonBin }, 'Python found — dkim and spf checking is enabled.');
}

/* Verify spamc/spamassassin availability. */
let isSpamcAvailable = true;
if (!shell.which('spamassassin') || !shell.which('spamc')) {
  logger.warn(
    { context: LOG_CONTEXT },
    'Either spamassassin or spamc are not available. Spam score computation is disabled.'
  );
  isSpamcAvailable = false;
}

/*
 * Provides high level mail utilities such as checking dkim, spf and computing
 * a spam score.
 */
module.exports = {
  /* @param rawEmail is the full raw mime email as a string. */
  validateDkim(rawEmail, callback) {
    if (!pythonBin) {
      return callback(null, false);
    }

    const verifyDkimPath = path.join(__dirname, '../python/verifydkim.py');
    const verifyDkim = child_process.spawn(pythonBin, [verifyDkimPath]);

    let stdout = '';
    let stderr = '';

    verifyDkim.stdout.on('data', (data) => {
      stdout += data.toString();
      logger.verbose({ context: LOG_CONTEXT }, data.toString());
    });

    verifyDkim.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    verifyDkim.on('close', (code) => {
      if (code) {
        /*
         * Exit 11 is the script's "signature did not verify" code; anything
         * else (tracebacks, missing modules, spawn issues) means the check
         * itself is broken and every email would be stamped as failed.
         */
        logger.warn(
          { context: LOG_CONTEXT, exitCode: code, stdout: stdout.trim(), stderr: stderr.trim() },
          code === 11
            ? 'DKIM verification failed: signature did not verify.'
            : 'DKIM verification errored: verifier script did not run cleanly — treating dkim as failed.'
        );
      } else {
        logger.verbose({ context: LOG_CONTEXT }, `closed with return code ${code}`);
      }

      /* Convert return code to appropriate boolean. */
      return callback(null, !code);
    });

    verifyDkim.stdin.write(rawEmail);
    verifyDkim.stdin.end();
  },

  validateSpf(ip, address, host, callback) {
    if (!pythonBin) {
      return callback(null, false);
    }

    const verifySpfPath = path.join(__dirname, '../python/verifyspf.py');
    /*
     * execFile stringifies non-string args, so an undefined sender would reach
     * the script as the literal "undefined". Empty strings are fine: pyspf
     * falls back to the HELO identity for an empty MAIL FROM (RFC 7208 §2.4).
     */
    const args = [verifySpfPath, ip ?? '', address ?? '', host ?? ''];

    child_process.execFile(pythonBin, args, (err, stdout, stderr) => {
      logger.verbose({ context: LOG_CONTEXT }, stdout);
      let code = 0;
      if (err) {
        code = err.code;
      }

      if (code) {
        const logPayload = {
          context: LOG_CONTEXT,
          exitCode: code,
          ip,
          address,
          host,
          stdout: typeof stdout === 'string' ? stdout.trim() : stdout,
          stderr: typeof stderr === 'string' ? stderr.trim() : stderr,
        };

        const verdict = SPF_VERDICT_LOGS[code];
        if (verdict) {
          logger[verdict.level](logPayload, verdict.message);
        } else {
          /*
           * Spawn/runtime breakage rather than an SPF verdict — this is the
           * only branch where the err object adds signal; for verdict codes it
           * is just "Command failed" + exit code and reads like a crash.
           */
          logger.warn(
            { ...logPayload, err },
            'SPF verification errored: verifier did not run cleanly — treating spf as failed.'
          );
        }
      } else {
        logger.verbose({ context: LOG_CONTEXT }, `closed with return code ${code}`);
      }

      /* Convert return code to appropriate boolean. */
      return callback(null, !code);
    });
  },

  /* @param rawEmail is the full raw mime email as a string. */
  computeSpamScore(rawEmail, callback) {
    if (!isSpamcAvailable) {
      return callback(null, 0.0);
    }

    spamc.report(rawEmail, (err, result) => {
      logger.verbose({ context: LOG_CONTEXT, result }, 'spamc report');
      if (err) {
        logger.error({ err, context: LOG_CONTEXT }, 'spamc reported an error');

        return callback(new Error('Unable to compute spam score.'));
      }
      callback(null, result.spamScore);
    });
  },
};
