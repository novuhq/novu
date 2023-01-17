'use strict';

var child_process = require('child_process');
var shell = require('shelljs');
var logger = require('./logger');
var path = require('path');
var Spamc = require('spamc');
var spamc = new Spamc();

/* Verify Python availability. */
var isPythonAvailable = shell.which('python');
if (!isPythonAvailable) {
  logger.warn('Python is not available. Dkim and spf checking is disabled.');
}

/* Verify spamc/spamassassin availability. */
var isSpamcAvailable = true;
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
  validateDkim: function (rawEmail, callback) {
    if (!isPythonAvailable) {
      return callback(null, false);
    }

    var verifyDkimPath = path.join(__dirname, '../python/verifydkim.py');
    var verifyDkim = child_process.spawn('python', [verifyDkimPath]);

    verifyDkim.stdout.on('data', function (data) {
      logger.verbose(data.toString());
    });

    verifyDkim.on('close', function (code) {
      logger.verbose('closed with return code ' + code);

      /* Convert return code to appropriate boolean. */
      return callback(null, !!!code);
    });

    verifyDkim.stdin.write(rawEmail);
    verifyDkim.stdin.end();
  },

  validateSpf: function (ip, address, host, callback) {
    if (!isPythonAvailable) {
      return callback(null, false);
    }

    var verifySpfPath = path.join(__dirname, '../python/verifyspf.py');
    var cmd = 'python ' + verifySpfPath + ' ' + ip + ' ' + address + ' ' + host;
    child_process.exec(cmd, function (err, stdout) {
      logger.verbose(stdout);
      var code = 0;
      if (err) {
        code = err.code;
      }

      logger.verbose('closed with return code ' + code);

      /* Convert return code to appropriate boolean. */
      return callback(null, !!!code);
    });
  },

  /* @param rawEmail is the full raw mime email as a string. */
  computeSpamScore: function (rawEmail, callback) {
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
