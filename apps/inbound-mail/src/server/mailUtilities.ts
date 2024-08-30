/* eslint-disable import/no-import-module-exports */
import child_process from 'node:child_process';
import shell from 'shelljs';
import path from 'node:path';
import Spamc from 'spamc';
import logger from './logger';

const spamc = new Spamc();

/* Verify Python availability. */
const isPythonAvailable = shell.which('python');
if (!isPythonAvailable) {
  logger.warn('Python is not available. Dkim and spf checking is disabled.');
}

/* Verify spamc/spamassassin availability. */
let isSpamcAvailable = true;
if (!shell.which('spamassassin') || !shell.which('spamc')) {
  logger.warn('Either spamassassin or spamc are not available. Spam score computation is disabled.');
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

    verifyDkim.stdout.on('data', function (data) {
      logger.verbose(data.toString());
    });

    verifyDkim.on('close', function (code) {
      logger.verbose(`closed with return code ${code}`);

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

    child_process.execFile(cmd, args, function (err, stdout) {
      logger.verbose(stdout);
      let code = 0;
      if (err) {
        code = err.code;
      }

      logger.verbose(`closed with return code ${code}`);

      /* Convert return code to appropriate boolean. */
      return callback(null, !code);
    });
  },

  /* @param rawEmail is the full raw mime email as a string. */
  computeSpamScore(rawEmail, callback) {
    if (!isSpamcAvailable) {
      return callback(null, 0.0);
    }

    spamc.report(rawEmail, function (err, result) {
      logger.verbose(result);
      if (err) logger.error(err);
      if (err) return callback(new Error('Unable to compute spam score.'));
      callback(null, result.spamScore);
    });
  },
};
