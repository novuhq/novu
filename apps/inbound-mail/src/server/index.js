'use strict';

import * as LanguageDetect from 'languagedetect';
import * as MailParser from 'mailparser';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as htmlToText from 'html-to-text';
import * as events from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'superagent';
import * as shell from 'shelljs';
import * as util from 'util';
import * as SMTPServer from 'smtp-server';
import * as uuid from 'node-uuid';
import * as dns from 'dns';
import * as extend from 'extend';
import * as logger from './logger';

const mailUtilities = Promise.promisifyAll(require('./mailUtilities'));

var Mailin = function () {
  events.EventEmitter.call(this);

  /* Set up the default options. */
  this.configuration = {
    host: '0.0.0.0',
    port: 2500,
    tmp: '.tmp',
    webhook: 'http://localhost:3000/webhook',
    disableWebhook: false,
    logFile: null,
    disableDkim: false,
    disableSpf: false,
    disableSpamScore: false,
    verbose: false,
    debug: false,
    logLevel: 'info',
    profile: false,
    disableDNSValidation: true,
    smtpOptions: {
      banner: 'Mailin Smtp Server',
      logger: false,
      disabledCommands: ['AUTH'],
    },
  };

  /*
   * The simplesmtp server instance, 'exposed' as an undocuumented, private
   * member. It is not meant for normal usage, but is can be uuseful for
   * Mailin hacking.
   * The instance will be initialized only after that mailin.start() has been called.
   */
  this._smtp = null;
};
util.inherits(Mailin, events.EventEmitter);

Mailin.prototype.start = function (options, callback) {
  var _this = this;

  options = options || {};
  if (_.isFunction(options)) {
    callback = options;
    options = {};
  }

  var configuration = this.configuration;
  extend(true, configuration, options);
  configuration.smtpOptions.secure = Boolean(configuration.smtpOptions.secure);

  callback = callback || function () {};

  /* Create tmp dir if necessary. */
  if (!fs.existsSync(configuration.tmp)) {
    shell.mkdir('-p', configuration.tmp);
  }

  /* Log to a file if necessary. */
  if (configuration.logFile) {
    logger.setLogFile(configuration.logFile);
  }

  /* Set log level if necessary. */
  if (configuration.logLevel) {
    logger.setLevel(configuration.logLevel);
  }

  if (configuration.verbose) {
    logger.setLevel('verbose');
    logger.info('Log level set to verbose.');
  }

  if (configuration.debug) {
    logger.info('Debug option activated.');
    logger.setLevel('debug');

    /* Enable debug for the simplesmtp server as well. */
    configuration.smtpOptions.debug = true;
  }

  /* Basic memory profiling. */
  if (configuration.profile) {
    logger.info('Enable memory profiling');
    setInterval(function () {
      var memoryUsage = process.memoryUsage();
      var ram = memoryUsage.rss + memoryUsage.heapUsed;
      var million = 1000000;
      logger.info(
        'Ram Usage: ' +
          ram / million +
          'mb | rss: ' +
          memoryUsage.rss / million +
          'mb | heapTotal: ' +
          memoryUsage.heapTotal / million +
          'mb | heapUsed: ' +
          memoryUsage.heapUsed / million
      );
    }, 500);
  }

  /* Check the webhook validity. */
  if (!configuration.disableWebhook) {
    var url = configuration.webhook;
    request
      .head(url)
      .timeout(3000)
      .end(function (err, resp) {
        if (err || resp.statusCode !== 200) {
          logger.warn(
            'Webhook ' + configuration.webhook + ' seems invalid or down. You may want to double check the webhook url.'
          );
        } else {
          logger.info('Webhook ' + configuration.webhook + ' is valid, up and running.');
        }
      });
  }

  function validateAddress(addressType, email, envelope) {
    return new Promise(function (resolve, reject) {
      if (configuration.disableDnsLookup) {
        return resolve();
      }
      try {
        var validateEvent, validationFailedEvent, dnsErrorMessage, localErrorMessage;

        if (addressType === 'sender') {
          validateEvent = 'validateSender';
          validationFailedEvent = 'senderValidationFailed';
          dnsErrorMessage = '450 4.1.8 <' + email + '>: Sender address rejected: Domain not found';
          localErrorMessage = '550 5.1.1 <' + email + '>: Sender address rejected: User unknown in local sender table';
        } else if (addressType === 'recipient') {
          validateEvent = 'validateRecipient';
          validationFailedEvent = 'recipientValidationFailed';
          dnsErrorMessage = '450 4.1.8 <' + email + '>: Recipient address rejected: Domain not found';
          localErrorMessage =
            '550 5.1.1 <' + email + '>: Recipient address rejected: User unknown in local recipient table';
        } else {
          // How are internal errors handled?
          return reject(new Error('Address type not supported'));
        }

        if (!email) {
          return reject(new Error(localErrorMessage));
        }

        var domain = /@(.*)/.exec(email)[1];

        var validateViaLocal = function () {
          if (_this.listeners(validateEvent).length) {
            _this.emit(validateEvent, envelope, email, function (err) {
              if (err) {
                _this.emit(validationFailedEvent, email);

                return reject(new Error(localErrorMessage));
              } else {
                return resolve();
              }
            });
          } else {
            return resolve();
          }
        };

        var validateViaDNS = function () {
          try {
            dns.resolveMx(domain, function (err, addresses) {
              if (err || !addresses || !addresses.length) {
                _this.emit(validationFailedEvent, email);

                return reject(new Error(dnsErrorMessage));
              }
              validateViaLocal();
            });
          } catch (e) {
            return reject(e);
          }
        };

        if (configuration.disableDNSValidation) {
          validateViaLocal();
        } else {
          validateViaDNS();
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  function dataReady(connection) {
    logger.info(connection.id + ' Processing message from ' + connection.envelope.mailFrom.address);

    return retrieveRawEmail(connection)
      .then(function (rawEmail) {
        return Promise.all([
          rawEmail,
          validateDkim(connection, rawEmail),
          validateSpf(connection),
          computeSpamScore(connection, rawEmail),
          parseEmail(connection),
        ]);
      })
      .spread(function (rawEmail, isDkimValid, isSpfValid, spamScore, parsedEmail) {
        return Promise.all([
          connection,
          rawEmail,
          isDkimValid,
          isSpfValid,
          spamScore,
          parsedEmail,
          detectLanguage(connection, parsedEmail.text),
        ]);
      })
      .spread(finalizeMessage)
      .then(postWebhook.bind(null, connection))
      .then(unlinkFile.bind(null, connection))
      .catch(function (error) {
        logger.error(connection.id + ' Unable to finish processing message!!', error);
        logger.error(error);
        throw error;
      });
  }

  function retrieveRawEmail(connection) {
    return fs.readFileAsync(connection.mailPath).then(function (rawEmail) {
      return rawEmail.toString();
    });
  }

  function validateDkim(connection, rawEmail) {
    if (configuration.disableDkim) {
      return Promise.resolve(false);
    }

    logger.verbose(connection.id + ' Validating dkim.');

    return mailUtilities.validateDkimAsync(rawEmail).catch(function (err) {
      logger.error(connection.id + ' Unable to validate dkim. Consider dkim as failed.');
      logger.error(err);

      return false;
    });
  }

  function validateSpf(connection) {
    if (configuration.disableSpf) {
      return Promise.resolve(false);
    }

    logger.verbose(connection.id + ' Validating spf.');

    /* Get ip and host. */
    return mailUtilities
      .validateSpfAsync(connection.remoteAddress, connection.from, connection.clientHostname)
      .catch(function (err) {
        logger.error(connection.id + ' Unable to validate spf. Consider spf as failed.');
        logger.error(err);

        return false;
      });
  }

  function computeSpamScore(connection, rawEmail) {
    if (configuration.disableSpamScore) {
      return Promise.resolve(0.0);
    }

    return mailUtilities.computeSpamScoreAsync(rawEmail).catch(function (err) {
      logger.error(connection.id + ' Unable to compute spam score. Set spam score to 0.');
      logger.error(err);

      return 0.0;
    });
  }

  function parseEmail(connection) {
    return new Promise(function (resolve) {
      logger.verbose(connection.id + ' Parsing email.');
      /* Prepare the mail parser. */
      var mailParser = new MailParser();

      mailParser.on('end', function (mail) {
        /*
         * logger.verbose(util.inspect(mail, {
         * depth: 5
         * }));
         */

        /*
         * Make sure that both text and html versions of the
         * body are available.
         */
        if (!mail.text && !mail.html) {
          mail.text = '';
          mail.html = '<div></div>';
        } else if (!mail.html) {
          mail.html = _this._convertTextToHtml(mail.text);
        } else if (!mail.text) {
          mail.text = _this._convertHtmlToText(mail.html);
        }

        return resolve(mail);
      });

      /* Stream the written email to the parser. */
      fs.createReadStream(connection.mailPath).pipe(mailParser);
    });
  }

  function detectLanguage(connection, text) {
    logger.verbose(connection.id + ' Detecting language.');

    let language = '';
    let languageDetector = new LanguageDetect();
    let potentialLanguages = languageDetector.detect(text, 2);
    if (potentialLanguages.length !== 0) {
      logger.verbose(
        'Potential languages: ' +
          util.inspect(potentialLanguages, {
            depth: 5,
          })
      );

      /*
       * Use the first detected language.
       * potentialLanguages = [['english', 0.5969], ['hungarian', 0.40563]]
       */
      language = potentialLanguages[0][0];
    } else {
      logger.info(connection.id + ' Unable to detect language for the current message.');
    }

    return language;
  }

  function finalizeMessage(connection, rawEmail, isDkimValid, isSpfValid, spamScore, parsedEmail, language) {
    /* Finalize the parsed email object. */
    parsedEmail.dkim = isDkimValid ? 'pass' : 'failed';
    parsedEmail.spf = isSpfValid ? 'pass' : 'failed';
    parsedEmail.spamScore = spamScore;
    parsedEmail.language = language;

    /*
     * Make fields exist, even if empty. That will make
     * json easier to use on the webhook receiver side.
     */
    parsedEmail.cc = parsedEmail.cc || [];
    parsedEmail.attachments = parsedEmail.attachments || [];

    /* Add the connection authentication to the parsedEmail. */
    parsedEmail.connection = connection;

    /* Add envelope data to the parsedEmail. */
    parsedEmail.envelopeFrom = connection.envelope.mailFrom;
    parsedEmail.envelopeTo = connection.envelope.rcptTo;

    _this.emit('message', connection, parsedEmail, rawEmail);

    return parsedEmail;
  }

  function postWebhook(connection, finalizedMessage) {
    return new Promise(function (resolve) {
      if (configuration.disableWebhook) return resolve();

      logger.info(connection.id + ' Sending request to webhook ' + configuration.webhook);

      /*
       * Convert the attachments contents from Buffer to
       * base64 encoded strings and remove them from the
       * message. They will be posted as multipart of a form
       * as key values pairs (attachmentName, attachmentContent).
       */
      logger.profile('Convert attachments to strings');
      var attachmentNamesAndContent = {};
      finalizedMessage.attachments.forEach(function (attachment) {
        attachmentNamesAndContent[attachment.generatedFileName] = (attachment.content || Buffer('')).toString('base64');
        delete attachment.content;
      });
      logger.profile('Convert attachments to strings');

      logger.debug(finalizedMessage);

      var req = request.post(configuration.webhook);
      req.field('mailinMsg', JSON.stringify(finalizedMessage));

      _.forEach(attachmentNamesAndContent, function (content, name) {
        req.field(name, content);
      });

      req.end(function (err, resp) {
        /* Avoid memory leak by hinting the gc. */

        if (err || resp.statusCode !== 200) {
          logger.error(connection.id + ' Error in posting to webhook ' + configuration.webhook);
          if (resp) {
            logger.error(connection.id + ' Response status code: ' + resp.statusCode);
          }

          return resolve();
        }

        logger.info(connection.id + ' Succesfully posted to webhook ' + configuration.webhook);
        logger.debug(resp.text);

        return resolve();
      });
    });
  }

  function unlinkFile(connection) {
    /* Don't forget to unlink the tmp file. */
    return fs.unlinkAsync(connection.mailPath).then(function () {
      logger.info(connection.id + ' End processing message, deleted ' + connection.mailPath);

      return;
    });
  }

  var _session;

  function onData(stream, session, callback) {
    _session = session;
    var connection = _.cloneDeep(session);
    connection.id = uuid.v4();
    var mailPath = path.join(configuration.tmp, connection.id);
    connection.mailPath = mailPath;

    _this.emit('startData', connection);
    logger.verbose('Connection id ' + connection.id);
    logger.info(connection.id + ' Receiving message from ' + connection.envelope.mailFrom.address);

    _this.emit('startMessage', connection);

    stream.pipe(fs.createWriteStream(mailPath));

    stream.on('data', function (chunk) {
      _this.emit('data', connection, chunk);
    });

    stream.on('end', function () {
      dataReady(connection);
      callback();
    });

    stream.on('close', function () {
      _this.emit('close', connection);
    });

    stream.on('error', function (error) {
      _this.emit('error', connection, error);
    });
  }

  function onAuth(auth, session, streamCallback) {
    if (_this.emit('authorizeUser', session, auth.username, auth.password, streamCallback)) {
      streamCallback(new Error('Unauthorized user'));
    }
  }

  function onMailFrom(address, session, streamCallback) {
    _this.emit('validateSender', session, address.address, streamCallback);
    var ack = function (err) {
      streamCallback(err);
    };
    validateAddress('sender', address.address, session.envelope).then(ack).catch(ack);
  }

  function onRcptTo(address, session, streamCallback) {
    var ack = function (err) {
      streamCallback(err);
    };
    _this.emit('validateRecipient', session, address.address, callback);
    validateAddress('recipient', address.address, session.envelope).then(ack).catch(ack);
  }

  var smtpOptions = _.extend({}, configuration.smtpOptions || {}, {
    onData: onData,
    onAuth: onAuth,
    onMailFrom: onMailFrom,
    onRcptTo: onRcptTo,
  });

  var server = new SMTPServer(smtpOptions);

  this._smtp = server;

  server.listen(configuration.port, configuration.host, function (err) {
    if (!err) {
      logger.info('Mailin Smtp server listening on port ' + configuration.port);
    } else {
      callback(err);
      logger.error('Could not start server on port ' + configuration.port + '.');
      if (configuration.port < 1000) {
        logger.error('Ports under 1000 require root privileges.');
      }

      if (configuration.logFile) {
        logger.error('Do you have write access to log file ' + configuration.logFile + '?');
      }

      logger.error(err.message);
    }
  });

  server.on('close', function () {
    logger.info('Closing smtp server');
    _this.emit('close', _session);
  });

  server.on('error', function (error) {
    logger.error(error);
    _this.emit('error', _session, error);
  });

  callback();
};

Mailin.prototype.stop = function (callback) {
  callback = callback || function () {};
  logger.info('Stopping mailin.');

  /*
   * FIXME A bug in the RAI module prevents the callback to be called, so
   * call end and call the callback directly.
   */
  this._smtp.close(callback);
  callback();
};

Mailin.prototype._convertTextToHtml = function (text) {
  /* Replace newlines by <br>. */
  text = text.replace(/(\n\r)|(\n)/g, '<br>');
  /* Remove <br> at the begining. */
  text = text.replace(/^\s*(<br>)*\s*/, '');
  /* Remove <br> at the end. */
  text = text.replace(/\s*(<br>)*\s*$/, '');

  return text;
};

Mailin.prototype._convertHtmlToText = function (html) {
  return htmlToText.fromString(html);
};

module.exports = new Mailin();
