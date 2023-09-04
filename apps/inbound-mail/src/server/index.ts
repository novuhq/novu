import { MailParser } from 'mailparser';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import { convert } from 'html-to-text';
import * as events from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as shell from 'shelljs';
import * as util from 'util';
import { SMTPServer } from 'smtp-server';
import * as uuid from 'node-uuid';
import * as dns from 'dns';
import * as extend from 'extend';
import { BullMqService } from '@novu/application-generic';

import { InboundMailQueueService } from './inbound-mail-queue.service';
import logger from './logger';

// eslint-disable-next-line @typescript-eslint/naming-convention
const LanguageDetect = require('languagedetect');
const mailUtilities = Promise.promisifyAll(require('./mailUtilities'));
const inboundMailQueueService = new InboundMailQueueService();
BullMqService.haveProInstalled();

class Mailin extends events.EventEmitter {
  public configuration: IConfiguration;

  private _smtp: SMTPServer;

  constructor() {
    super();
    this.configuration = {
      host: '0.0.0.0',
      port: 2500,
      tmp: '.tmp',
      disableWebhook: true,
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
    this._smtp = null;
  }

  public start(options: any, callback: (err?) => void) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;

    options = options || {};
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    const configuration = this.configuration;
    extend(true, configuration, options);

    if (!configuration.smtpOptions) {
      configuration.smtpOptions = {} as ISmtpOptions;
    }

    configuration.smtpOptions.secure = configuration.smtpOptions?.secure
      ? Boolean(configuration.smtpOptions.secure)
      : false;

    callback = callback || function () {};

    /* Create tmp dir if necessary. */
    if (!fs.existsSync(configuration.tmp)) {
      shell.mkdir('-p', configuration.tmp);
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

      configuration.smtpOptions.debug = true;
    }

    /* Basic memory profiling. */
    if (configuration.profile) {
      logger.info('Enable memory profiling');
      setInterval(function () {
        const memoryUsage = process.memoryUsage();
        const ram = memoryUsage.rss + memoryUsage.heapUsed;
        const million = 1000000;
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

    function validateAddress(addressType, email, envelope) {
      return new Promise(function (resolve, reject) {
        if (configuration.disableDnsLookup) {
          return resolve();
        }
        try {
          let validateEvent, validationFailedEvent, dnsErrorMessage, localErrorMessage;

          if (addressType === 'sender') {
            validateEvent = 'validateSender';
            validationFailedEvent = 'senderValidationFailed';
            dnsErrorMessage = '450 4.1.8 <' + email + '>: Sender address rejected: Domain not found';
            localErrorMessage =
              '550 5.1.1 <' + email + '>: Sender address rejected: User unknown in local sender table';
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

          const domain = /@(.*)/.exec(email)[1];

          const validateViaLocal = function () {
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

          const validateViaDNS = function () {
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
        .then(function ([rawEmail, isDkimValid, isSpfValid, spamScore, parsedEmail]) {
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
        .then(function ([connectionFinalize, rawEmail, isDkimValid, isSpfValid, spamScore, parsedEmail, language]) {
          const args = [connectionFinalize, rawEmail, isDkimValid, isSpfValid, spamScore, parsedEmail, language];

          return finalizeMessage.apply(this, args);
        })
        .then(postQueue.bind(null, connection))
        .then(unlinkFile.bind(null, connection))
        .catch(function (error) {
          logger.error(error, connection.id + ' Unable to finish processing message!!');
          logger.error(error);
          throw error;
        });
    }

    function retrieveRawEmail(connection) {
      return fs.promises.readFile(connection.mailPath).then(function (rawEmail) {
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
        const mailParser = new MailParser();

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

      const languageDetector = new LanguageDetect();
      const potentialLanguages = languageDetector.detect(text, 2);
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
      // parsedEmail.attachments = parsedEmail.attachments || [];

      /* Add the connection authentication to the parsedEmail. */
      parsedEmail.connection = connection;

      /* Add envelope data to the parsedEmail. */
      parsedEmail.envelopeFrom = connection.envelope.mailFrom;
      parsedEmail.envelopeTo = connection.envelope.rcptTo;

      _this.emit('message', connection, parsedEmail, rawEmail);

      return parsedEmail;
    }

    function postQueue(connection, finalizedMessage) {
      return new Promise(function (resolve) {
        logger.debug(connection.id + ' finalized message is: ' + finalizedMessage);

        logger.info(connection.id + ' Adding mail to queue ');

        const toAddress = getAddressTo(finalizedMessage);
        const parts: string[] = toAddress.split('@');
        const username: string = parts[0];
        const environmentId = username.split('-nv-e=').at(-1);

        inboundMailQueueService.bullMqService.add(
          finalizedMessage.messageId,
          finalizedMessage,
          {
            removeOnComplete: true,
            removeOnFail: true,
          },
          environmentId
        );

        return resolve();
      });
    }
    function unlinkFile(connection) {
      /* Don't forget to unlink the tmp file. */
      return fs.promises.unlink(connection.mailPath).then(function () {
        logger.info(connection.id + ' End processing message, deleted ' + connection.mailPath);

        return;
      });
    }

    let _session;

    function onData(stream, session, onDataCallback) {
      try {
        _session = session;
        const connection = _.cloneDeep(session);
        connection.id = uuid.v4();
        const mailPath = path.join(configuration.tmp, connection.id);
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
          onDataCallback();
        });

        stream.on('close', function () {
          _this.emit('close', connection);
        });

        stream.on('error', function (error) {
          _this.emit('error', connection, error);
        });
      } catch (e) {
        logger.error('Exception occurred while performing onData callback', e);
      }
    }

    function onAuth(auth, session, streamCallback) {
      if (_this.emit('authorizeUser', session, auth.username, auth.password, streamCallback)) {
        streamCallback(new Error('Unauthorized user'));
      }
    }

    function onMailFrom(address, session, streamCallback) {
      _this.emit('validateSender', session, address.address, streamCallback);
      const ack = function (err) {
        streamCallback(err);
      };
      validateAddress('sender', address.address, session.envelope).then(ack).catch(ack);
    }

    function onRcptTo(address, session, streamCallback) {
      const ack = function (err) {
        streamCallback(err);
      };
      _this.emit('validateRecipient', session, address.address, callback);
      validateAddress('recipient', address.address, session.envelope).then(ack).catch(ack);
    }

    const smtpOptions = _.extend({}, configuration.smtpOptions || {}, {
      onData: onData,
      onAuth: onAuth,
      onMailFrom: onMailFrom,
      onRcptTo: onRcptTo,
    });

    const server = new SMTPServer(smtpOptions);

    this._smtp = server;

    server.listen(configuration.port, configuration.host, function () {
      logger.info('Mailin Smtp server listening on port ' + configuration.port);
    });

    server.on('close', function () {
      logger.info('Closing smtp server');
      _this.emit('close', _session);
    });

    server.on('error', function (error) {
      callback(error);
      if (configuration.port < 1000) {
        logger.error('Ports under 1000 require root privileges.');
      }

      logger.error(error);
      _this.emit('error', _session, error);
    });

    callback();
  }

  public stop(callback: () => void) {
    callback = callback || function () {};
    logger.info('Stopping mailin.');

    /*
     * FIXME A bug in the RAI module prevents the callback to be called, so
     * call end and call the callback directly.
     */
    this._smtp.close(callback);
    callback();
  }

  public _convertTextToHtml(text) {
    /* Replace newlines by <br>. */
    text = text.replace(/(\n\r)|(\n)/g, '<br>');
    /* Remove <br> at the beginning. */
    text = text.replace(/^\s*(<br>)*\s*/, '');
    /* Remove <br> at the end. */
    text = text.replace(/\s*(<br>)*\s*$/, '');

    return text;
  }

  public _convertHtmlToText(html) {
    return convert(html);
  }
}

function getAddressTo(finalizedMessage) {
  const toAddressObject = Array.isArray(finalizedMessage.envelopeTo)
    ? finalizedMessage.envelopeTo[0]
    : finalizedMessage.envelopeTo;

  return toAddressObject.address ?? toAddressObject;
}
interface ISmtpOptions {
  banner: string;
  logger: boolean;
  disabledCommands: string[];
  secure?: boolean;
  debug?: boolean;
}

interface IConfiguration {
  host: string;
  port: number;
  tmp: string;
  disableWebhook: boolean;
  disableDkim: boolean;
  disableSpf: boolean;
  disableSpamScore: boolean;
  verbose: boolean;
  debug: boolean;
  logLevel: string;
  profile: boolean;
  disableDNSValidation: boolean;
  smtpOptions?: ISmtpOptions;
  disableDnsLookup?: boolean;
}

export default new Mailin();
