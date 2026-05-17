import child_process from 'node:child_process';
import path from 'node:path';
import shell from 'shelljs';
import Spamc from 'spamc';
import logger from './logger';

const LOG_CONTEXT = 'MailUtilities';

const spamc = new Spamc();

/* Verify Python availability. */
const isPythonAvailable = shell.which('python');
if (!isPythonAvailable) {
  logger.warn({ context: LOG_CONTEXT }, 'Python is not available. Dkim and spf checking is disabled.');
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
    if (!isPythonAvailable) {
      return callback(null, false);
    }

    const verifyDkimPath = path.join(__dirname, '../python/verifydkim.py');
    const verifyDkim = child_process.spawn('python', [verifyDkimPath]);

    verifyDkim.stdout.on('data', (data) => {
      logger.verbose({ context: LOG_CONTEXT }, data.toString());
    });

    verifyDkim.on('close', (code) => {
      logger.verbose({ context: LOG_CONTEXT }, `closed with return code ${code}`);

      /* Convert return code to appropriate boolean. */
      return callback(null, !code);
    });

    verifyDkim.stdin.write(rawEmail);
    verifyDkim.stdin.end();
  },

  validateSpf(ip, address, host, callback) {
    if (!isPythonAvailable) {
      return callback(null, false);
    }

    const verifySpfPath = path.join(__dirname, '../python/verifyspf.py');
    const cmd = 'python ';
    const args = [verifySpfPath, ip, address, host];

    child_process.execFile(cmd, args, (err, stdout) => {
      logger.verbose({ context: LOG_CONTEXT }, stdout);
      let code = 0;
      if (err) {
        code = err.code;
      }

      logger.verbose({ context: LOG_CONTEXT }, `closed with return code ${code}`);

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
