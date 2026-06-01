import fs from 'node:fs';
import { BullMqService, buildEnvelopeRequestSource } from '@novu/application-generic';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import Promise from 'bluebird';
import dns from 'dns';
import events from 'events';
import extend from 'extend';
import { convert } from 'html-to-text';
import _ from 'lodash';
import { MailParser } from 'mailparser';
import path from 'path';
import shell from 'shelljs';
import { SMTPServer } from 'smtp-server';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';

import { uploadAttachmentsToS3 } from './attachment-uploader';
import { InboundMailService } from './inbound-mail.service';
import logger from './logger';

const nr = require('newrelic');

const LOG_CONTEXT = 'Mailin';

const LanguageDetect = require('languagedetect');
const mailUtilities = Promise.promisifyAll(require('./mailUtilities'));

const inboundMailService = new InboundMailService();
BullMqService.haveProInstalled();

/**
 * Exposed for tests so they can inject mock `requestLogger` / `tenantResolver`
 * without standing up real ClickHouse / MongoDB. Production code should not
 * read from this export.
 */
export const __testInboundMailService = inboundMailService;

class Mailin extends events.EventEmitter {
  public configuration: IConfiguration;

  private _smtp: SMTPServer;

  constructor() {
    super();

    this.configuration = {
      host: '127.0.0.1',
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

  public async start(options: object, callback: (err?) => void) {
    const _this = this;

    const { configuration } = this;
    extend(true, configuration, options);

    if (!configuration.smtpOptions) {
      configuration.smtpOptions = {} as ISmtpOptions;
    }

    configuration.smtpOptions.secure = configuration.smtpOptions?.secure
      ? Boolean(configuration.smtpOptions.secure)
      : false;

    callback = callback || (() => {});

    /* Create tmp dir if necessary. */
    if (!fs.existsSync(configuration.tmp)) {
      shell.mkdir('-p', configuration.tmp);
    }

    /* Basic memory profiling. */
    if (configuration.profile) {
      logger.info({ context: LOG_CONTEXT }, 'Enable memory profiling');
      setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const ram = memoryUsage.rss + memoryUsage.heapUsed;
        const million = 1000000;
        logger.info(
          { context: LOG_CONTEXT },
          `Ram Usage: ${ram / million}mb | rss: ${memoryUsage.rss / million}mb | heapTotal: ${
            memoryUsage.heapTotal / million
          }mb | heapUsed: ${memoryUsage.heapUsed / million}`
        );
      }, 500);
    }

    function validateAddress(addressType, email, envelope) {
      return new Promise((resolve, reject) => {
        if (configuration.disableDnsLookup) {
          return resolve();
        }
        try {
          let validateEvent;
          let validationFailedEvent;
          let dnsErrorMessage;
          let localErrorMessage;

          if (addressType === 'sender') {
            validateEvent = 'validateSender';
            validationFailedEvent = 'senderValidationFailed';
            dnsErrorMessage = `450 4.1.8 <${email}>: Sender address rejected: Domain not found`;
            localErrorMessage = `550 5.1.1 <${email}>: Sender address rejected: User unknown in local sender table`;
          } else if (addressType === 'recipient') {
            validateEvent = 'validateRecipient';
            validationFailedEvent = 'recipientValidationFailed';
            dnsErrorMessage = `450 4.1.8 <${email}>: Recipient address rejected: Domain not found`;
            localErrorMessage = `550 5.1.1 <${email}>: Recipient address rejected: User unknown in local recipient table`;
          } else {
            // How are internal errors handled?
            return reject(new Error('Address type not supported'));
          }

          if (!email) {
            return reject(new Error(localErrorMessage));
          }

          const domain = /@(.*)/.exec(email)[1];

          const validateViaLocal = () => {
            if (_this.listeners(validateEvent).length) {
              _this.emit(validateEvent, envelope, email, (err) => {
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

          const validateViaDNS = () => {
            try {
              dns.resolveMx(domain, (err, addresses) => {
                if (err || !addresses || !addresses.length) {
                  _this.emit(validationFailedEvent, email);

                  return reject(new Error(dnsErrorMessage));
                }
                validateViaLocal();
              });
            } catch (e) {
              logger.error({ err: e, context: LOG_CONTEXT }, 'Exception occurred while validating DNS');
              return reject(new Error(e));
            }
          };

          if (configuration.disableDNSValidation) {
            validateViaLocal();
          } else {
            validateViaDNS();
          }
        } catch (e) {
          logger.error({ err: e, context: LOG_CONTEXT }, 'Exception occurred while validating address');
          reject(e);
        }
      });
    }

    function dataReady(connection) {
      return new Promise<void>((resolve, reject) => {
        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.INBOUND_MAIL_PROCESSING,
          'Inbound Mail',
          () => {
            const transaction = nr.getTransaction();

            try {
              /*
               * Attach only non-PII / non-attacker-controlled metadata. Sender and
               * recipient addresses, client IPs, and HELO hostnames are intentionally
               * omitted so attacker-controlled inbound SMTP traffic cannot leak
               * personal/network identifiers into our APM backend. Use connectionId
               * to correlate with our own pino logs when investigating an incident.
               */
              nr.addCustomAttributes({
                'mail.connectionId': connection.id,
                'mail.envelopeRecipientCount': Array.isArray(connection.envelope?.rcptTo)
                  ? connection.envelope.rcptTo.length
                  : 0,
                'mail.hasEnvelopeFrom': Boolean(connection.envelope?.mailFrom?.address),
                'mail.transmissionType': connection.secure ? 'secure' : 'plain',
              });
            } catch (attributeError) {
              logger.warn(
                { err: attributeError, context: LOG_CONTEXT, connectionId: connection.id },
                'Failed to attach inbound mail New Relic attributes'
              );
            }

            logger.info(
              { context: LOG_CONTEXT, connectionId: connection.id },
              `${connection.id} Processing message from ${connection.envelope.mailFrom.address}`
            );

            return logInboundMailAccepted(connection)
              .then(() => retrieveRawEmail(connection))
              .then((rawEmail) =>
                Promise.all([
                  rawEmail,
                  validateDkim(connection, rawEmail),
                  validateSpf(connection),
                  computeSpamScore(connection, rawEmail),
                  parseEmail(connection),
                ])
              )
              .then(([rawEmail, isDkimValid, isSpfValid, spamScore, parsedEmail]) =>
                Promise.all([
                  connection,
                  rawEmail,
                  isDkimValid,
                  isSpfValid,
                  spamScore,
                  parsedEmail,
                  detectLanguage(connection, parsedEmail.text),
                ])
              )
              .then(function ([
                connectionFinalize,
                rawEmail,
                isDkimValid,
                isSpfValid,
                spamScore,
                parsedEmail,
                language,
              ]) {
                const args = [connectionFinalize, rawEmail, isDkimValid, isSpfValid, spamScore, parsedEmail, language];

                return finalizeMessage.apply(this, args);
              })
              .then(async (finalizedMessage) => {
                try {
                  /*
                   * Only operational/aggregate metadata — no Message-ID (can echo
                   * sender content), no addresses, no headers. These are safe to
                   * export to APM regardless of how attacker-controlled the
                   * underlying email is.
                   */
                  nr.addCustomAttributes({
                    'mail.dkim': finalizedMessage?.dkim,
                    'mail.spf': finalizedMessage?.spf,
                    'mail.spamScore': finalizedMessage?.spamScore,
                    'mail.language': finalizedMessage?.language,
                    'mail.attachmentCount': Array.isArray(finalizedMessage?.attachments)
                      ? finalizedMessage.attachments.length
                      : 0,
                    'mail.hasInReplyTo': Boolean(finalizedMessage?.inReplyTo),
                    'mail.referencesCount': Array.isArray(finalizedMessage?.references)
                      ? finalizedMessage.references.length
                      : 0,
                  });
                } catch (attributeError) {
                  logger.warn(
                    { err: attributeError, context: LOG_CONTEXT, connectionId: connection.id },
                    'Failed to attach inbound mail finalized New Relic attributes'
                  );
                }

                return finalizedMessage;
              })
              .then((finalizedMessage) =>
                nr.startSegment('inbound-mail/upload-attachments', true, async () => {
                  if (Array.isArray(finalizedMessage.attachments) && finalizedMessage.attachments.length > 0) {
                    const { mode, uploaded, failedCount, retriableFailedCount } = await uploadAttachmentsToS3(
                      finalizedMessage.messageId,
                      finalizedMessage.attachments
                    );

                    finalizedMessage.attachments = uploaded;

                    try {
                      nr.addCustomAttributes({ 'mail.attachmentMode': mode });
                    } catch {
                      // instrumentation must never break the pipeline
                    }

                    if (failedCount > 0) {
                      try {
                        nr.addCustomAttributes({ 'mail.attachmentUploadFailedCount': failedCount });
                      } catch {
                        // instrumentation must never break the pipeline
                      }

                      logger.warn(
                        { context: LOG_CONTEXT, connectionId: connection.id, failedCount, mode },
                        `${connection.id} ${failedCount} attachment(s) failed in ${mode} mode and were dropped`
                      );

                      /*
                       * When INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR=true and we were
                       * uploading to S3, signal a transient SMTP failure (4xx) so the
                       * sending MTA retries delivery rather than silently dropping
                       * attachments. Because buildStorageKey is deterministic by
                       * (messageId, index, filename), retries idempotently overwrite
                       * the same S3 key on success.
                       *
                       * Gate on retriableFailedCount (transient S3 upload errors), NOT
                       * the total failedCount: structural drops (no content, unsupported
                       * shape, inline size-cap) would re-fail on every redelivery, so
                       * retrying them would create an infinite 451 loop. Inline-mode
                       * processing reports retriableFailedCount=0, so it is skipped too.
                       */
                      if (
                        mode === 's3' &&
                        retriableFailedCount > 0 &&
                        process.env.INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR === 'true'
                      ) {
                        const error: Error & { responseCode?: number } = new Error(
                          `Attachment upload failed: ${retriableFailedCount} attachment(s) could not be stored`
                        );
                        error.responseCode = 451;
                        throw error;
                      }
                    }
                  }

                  return finalizedMessage;
                })
              )
              .then(postQueue.bind(null, connection))
              .then(
                () => unlinkFile(connection).then(() => resolve()),
                (processingError) => {
                  nr.noticeError(processingError);
                  emitProcessingFailureTrace(connection, processingError);
                  logger.error(
                    { err: processingError, context: LOG_CONTEXT, connectionId: connection.id },
                    `${connection.id} Unable to finish processing message!!`
                  );

                  /*
                   * Always clean up the temp raw email — even on the failure path.
                   * SMTP returns 4xx so the sending MTA retries delivery, which
                   * produces a fresh temp file. Retaining the failed file would
                   * let an attacker amplify a queue/Redis outage into disk
                   * exhaustion by repeatedly submitting messages while the
                   * downstream queue is degraded. Unlink is best-effort so a
                   * cleanup failure does not mask the original processing error.
                   */
                  return unlinkFile(connection).then(() => reject(processingError));
                }
              )
              .finally(() => {
                if (transaction) {
                  transaction.end();
                }
              });
          }
        );
      });
    }

    function retrieveRawEmail(connection) {
      return nr.startSegment('inbound-mail/retrieve-raw-email', true, () =>
        fs.promises.readFile(connection.mailPath).then((rawEmail) => rawEmail.toString())
      );
    }

    function validateDkim(connection, rawEmail) {
      return nr.startSegment('inbound-mail/validate-dkim', true, () => {
        if (configuration.disableDkim) {
          return Promise.resolve(false);
        }

        logger.verbose({ context: LOG_CONTEXT, connectionId: connection.id }, `${connection.id} Validating dkim.`);

        return mailUtilities.validateDkimAsync(rawEmail).catch((err) => {
          logger.error(
            { err, context: LOG_CONTEXT, connectionId: connection.id },
            `${connection.id} Unable to validate dkim. Consider dkim as failed.`
          );

          return false;
        });
      });
    }

    function validateSpf(connection) {
      return nr.startSegment('inbound-mail/validate-spf', true, () => {
        if (configuration.disableSpf) {
          return Promise.resolve(false);
        }

        logger.verbose({ context: LOG_CONTEXT, connectionId: connection.id }, `${connection.id} Validating spf.`);

        /* Get ip and host. */
        return mailUtilities
          .validateSpfAsync(connection.remoteAddress, connection.from, connection.clientHostname)
          .catch((err) => {
            logger.error(
              { err, context: LOG_CONTEXT, connectionId: connection.id },
              `${connection.id} Unable to validate spf. Consider spf as failed.`
            );

            return false;
          });
      });
    }

    function computeSpamScore(connection, rawEmail) {
      return nr.startSegment('inbound-mail/compute-spam-score', true, () => {
        if (configuration.disableSpamScore) {
          return Promise.resolve(0.0);
        }

        return mailUtilities.computeSpamScoreAsync(rawEmail).catch((err) => {
          logger.error(
            { err, context: LOG_CONTEXT, connectionId: connection.id },
            `${connection.id} Unable to compute spam score. Set spam score to 0.`
          );

          return 0.0;
        });
      });
    }

    function parseEmail(connection) {
      return nr.startSegment(
        'inbound-mail/parse-email',
        true,
        () =>
          new Promise((resolve) => {
            logger.verbose({ context: LOG_CONTEXT, connectionId: connection.id }, `${connection.id} Parsing email.`);

            /* Prepare the mail parser. */
            const mailParser = new MailParser();

            mailParser.on('end', (mail) => {
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
          })
      );
    }

    function detectLanguage(connection, text) {
      return nr.startSegment('inbound-mail/detect-language', true, () => {
        logger.verbose({ context: LOG_CONTEXT, connectionId: connection.id }, `${connection.id} Detecting language.`);

        let language = '';

        const languageDetector = new LanguageDetect();
        const potentialLanguages = languageDetector.detect(text, 2);
        if (potentialLanguages.length !== 0) {
          logger.verbose(
            { context: LOG_CONTEXT, connectionId: connection.id },
            `Potential languages: ${util.inspect(potentialLanguages, {
              depth: 5,
            })}`
          );

          /*
           * Use the first detected language.
           * potentialLanguages = [['english', 0.5969], ['hungarian', 0.40563]]
           */
          language = potentialLanguages[0][0];
        } else {
          logger.info(
            { context: LOG_CONTEXT, connectionId: connection.id },
            `${connection.id} Unable to detect language for the current message.`
          );
        }

        return language;
      });
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

      /*
       * Preserve threading headers so downstream consumers can correlate
       * replies back to the original outbound message.
       * mailparser@0.6.x stores both fields as string[] — normalise them to
       * the shapes expected by IInboundParseDataDto / InboundEmailParseCommand
       * so class-validator's @IsString() / @IsOptional() passes correctly.
       * inReplyTo  → string | null  (RFC 5322 allows only one message-id)
       * references → string[] | null
       */
      parsedEmail.inReplyTo = Array.isArray(parsedEmail.inReplyTo)
        ? (parsedEmail.inReplyTo[0] ?? null)
        : (parsedEmail.inReplyTo ?? null);

      parsedEmail.references = Array.isArray(parsedEmail.references)
        ? parsedEmail.references.length > 0
          ? parsedEmail.references
          : null
        : (parsedEmail.references ?? null);

      _this.emit('message', connection, parsedEmail, rawEmail);

      return parsedEmail;
    }

    function logInboundMailAccepted(connection) {
      return nr.startSegment('inbound-mail/log-received', true, async () => {
        const requestLogger = inboundMailService.requestLogger;
        const tenantResolver = inboundMailService.tenantResolver;

        if (!requestLogger || !tenantResolver) {
          return;
        }

        const toAddress = getEnvelopeToAddress(connection);

        if (!toAddress) {
          return;
        }

        try {
          const tenant = await tenantResolver.resolve(toAddress, undefined);
          const durationMs = connection.startTimeMs ? Date.now() - connection.startTimeMs : 0;

          const requestLogId = await requestLogger.logReceived({
            source: buildEnvelopeRequestSource(connection.envelope, {
              remoteAddress: connection.remoteAddress,
              clientHostname: connection.clientHostname,
            }),
            toAddress,
            tenant,
            durationMs,
          });

          if (requestLogId) {
            connection.requestLogContext = {
              requestLogId,
              organizationId: tenant.organizationId,
              environmentId: tenant.environmentId,
              transactionId: tenant.transactionId,
            };
          }
        } catch (error) {
          // Observability writes must never block the SMTP pipeline.
          logger.warn(
            { err: error, context: LOG_CONTEXT, connectionId: connection.id },
            `${connection.id} Failed to write inbound-mail request log — continuing`
          );
        }
      });
    }

    function postQueue(connection, finalizedMessage) {
      return nr.startSegment(
        'inbound-mail/post-queue',
        true,
        () =>
          new Promise<void>((resolve, reject) => {
            logger.debug(
              { context: LOG_CONTEXT, connectionId: connection.id },
              `${connection.id} finalized message is: ${finalizedMessage}`
            );

            logger.info(
              { context: LOG_CONTEXT, connectionId: connection.id },
              `${connection.id} Adding mail to queue `
            );

            const requestLogContext = connection.requestLogContext;
            if (requestLogContext?.requestLogId) {
              finalizedMessage.requestLogId = requestLogContext.requestLogId;
            }

            const toAddress = getAddressTo(finalizedMessage);
            const parts: string[] = toAddress.split('@');
            const username: string = parts[0];
            const domainPart: string = parts[1];

            /*
             * Legacy reply-to addresses encode the environmentId in the username segment
             * (e.g. parse+txnId-nv-e=envId@domain). For plain domain-route addresses
             * (e.g. support@customer.com) fall back to the domain part as the groupId
             * so BullMQ can still bucket concurrent jobs by domain.
             */
            const isLegacyReplyToRoute = username.includes('-nv-e=');
            const groupId = isLegacyReplyToRoute ? username.split('-nv-e=').at(-1) : domainPart;

            try {
              /*
               * Only emit groupId when it's a Novu-internal environmentId (legacy
               * reply-to route). For domain-routed mail the groupId is the
               * recipient's domain — that's tenant/PII-adjacent metadata, so we
               * report only the routing strategy instead of the domain itself.
               */
              nr.addCustomAttributes({
                'mail.queue.routeType': isLegacyReplyToRoute ? 'reply-to' : 'domain',
                ...(isLegacyReplyToRoute ? { 'mail.queue.environmentId': groupId } : {}),
              });
            } catch {
              // ignore — instrumentation must never break the pipeline
            }

            return inboundMailService.inboundParseQueueService
              .add({
                name: finalizedMessage.messageId,
                data: finalizedMessage,
                groupId,
              })
              .then(() => {
                emitQueueLifecycleTrace(connection, 'queued');
                resolve();
              })
              .catch((error) => {
                logger.error(
                  { err: error, context: LOG_CONTEXT, connectionId: connection.id },
                  `${connection.id} Failed to add inbound mail to queue`
                );
                emitQueueLifecycleTrace(
                  connection,
                  'queue-failed',
                  error instanceof Error ? error.message : 'Failed to enqueue inbound mail'
                );
                reject(error);
              });
          })
      );
    }

    function emitProcessingFailureTrace(connection, processingError) {
      const requestLogger = inboundMailService.requestLogger;
      const context = connection.requestLogContext;

      if (!requestLogger || !context) {
        return;
      }

      const message = processingError instanceof Error ? processingError.message : 'Inbound mail processing failed';

      requestLogger.logProcessingFailed({ ...context, message }).catch((traceError) => {
        logger.warn(
          { err: traceError, context: LOG_CONTEXT, connectionId: connection.id },
          `${connection.id} Failed to write inbound-mail processing-failure trace`
        );
      });
    }

    function emitQueueLifecycleTrace(connection, phase: 'queued' | 'queue-failed', message?: string) {
      const requestLogger = inboundMailService.requestLogger;
      const context = connection.requestLogContext;

      if (!requestLogger || !context) {
        return;
      }

      const promise =
        phase === 'queued' ? requestLogger.logQueued(context) : requestLogger.logQueueFailed({ ...context, message });

      promise.catch((traceError) => {
        // Trace writes are best-effort; never fail the SMTP pipeline on them.
        logger.warn(
          { err: traceError, context: LOG_CONTEXT, connectionId: connection.id, phase },
          `${connection.id} Failed to write inbound-mail ${phase} trace`
        );
      });
    }
    /*
     * Best-effort cleanup of the raw email temp file. Used on both success and
     * failure paths so a sustained queue outage cannot be amplified into a
     * disk-exhaustion DoS via retained temp files (NV-7596). Swallows ENOENT
     * (the file may never have been written, e.g. if `retrieveRawEmail`
     * failed) and logs any other unlink error without rejecting — the caller
     * may already be propagating an upstream processing error and we don't
     * want a cleanup failure to mask it.
     */
    function unlinkFile(connection): Promise<void> {
      return nr.startSegment('inbound-mail/unlink-file', true, () =>
        fs.promises
          .unlink(connection.mailPath)
          .then(() => {
            logger.info(
              { context: LOG_CONTEXT, connectionId: connection.id },
              `${connection.id} End processing message, deleted ${connection.mailPath}`
            );
          })
          .catch((unlinkError: NodeJS.ErrnoException) => {
            if (unlinkError?.code === 'ENOENT') {
              return;
            }
            logger.warn(
              { err: unlinkError, context: LOG_CONTEXT, connectionId: connection.id },
              `${connection.id} Failed to clean up temp file ${connection.mailPath}`
            );
          })
      );
    }

    let _session;

    function onData(stream, session, onDataCallback) {
      try {
        _session = session;
        const connection = _.cloneDeep(session);
        connection.id = uuidv4();
        const mailPath = path.join(configuration.tmp, connection.id);
        connection.mailPath = mailPath;

        _this.emit('startData', connection);
        logger.verbose({ context: LOG_CONTEXT, connectionId: connection.id }, `Connection id ${connection.id}`);
        logger.info(
          { context: LOG_CONTEXT, connectionId: connection.id },
          `${connection.id} Receiving message from ${connection.envelope.mailFrom.address}`
        );

        connection.startTimeMs = Date.now();
        _this.emit('startMessage', connection);

        stream.pipe(fs.createWriteStream(mailPath));

        stream.on('data', (chunk) => {
          _this.emit('data', connection, chunk);
        });

        stream.on('end', () => {
          dataReady(connection)
            .then(() => onDataCallback())
            .catch((error) => {
              nr.noticeError(error);
              logger.error(
                { err: error, context: LOG_CONTEXT, connectionId: connection.id },
                `${connection.id} Inbound mail processing failed; signalling temporary failure to sender for retry`
              );

              /*
               * Signal a transient failure (4xx) to the sending MTA so it retries
               * delivery instead of treating the message as accepted. Without
               * this, a queue-insert failure after an unconditional onDataCallback()
               * would silently drop the message — sender thinks 250 OK, we have
               * nothing persisted.
               */
              const smtpError: Error & { responseCode?: number } =
                error instanceof Error ? error : new Error(String(error));
              if (typeof smtpError.responseCode !== 'number') {
                smtpError.responseCode = 451;
              }
              onDataCallback(smtpError);
            });
        });

        stream.on('close', () => {
          _this.emit('close', connection);
        });

        stream.on('error', (error) => {
          _this.emit('error', connection, error);
        });
      } catch (error) {
        nr.noticeError(error);
        logger.error({ err: error, context: LOG_CONTEXT }, 'Exception occurred while performing onData callback');
      }
    }

    function onAuth(auth, session, streamCallback) {
      if (_this.emit('authorizeUser', session, auth.username, auth.password, streamCallback)) {
        streamCallback(new Error('Unauthorized user'));
      }
    }

    function onMailFrom(address, session, streamCallback) {
      _this.emit('validateSender', session, address.address, streamCallback);
      const ack = (err) => {
        streamCallback(err);
      };
      validateAddress('sender', address.address, session.envelope).then(ack).catch(ack);
    }

    function onRcptTo(address, session, streamCallback) {
      const ack = (err) => {
        streamCallback(err);
      };
      _this.emit('validateRecipient', session, address.address, callback);
      validateAddress('recipient', address.address, session.envelope).then(ack).catch(ack);
    }

    const smtpOptions = _.extend({}, configuration.smtpOptions || {}, {
      onData,
      onAuth,
      onMailFrom,
      onRcptTo,
    });

    await inboundMailService.start();

    const server = new SMTPServer(smtpOptions);

    this._smtp = server;

    server.listen(configuration.port, configuration.host, () => {
      logger.info({ context: LOG_CONTEXT }, `Mailin Smtp server listening on port ${configuration.port}`);
    });

    server.on('close', () => {
      logger.info({ context: LOG_CONTEXT }, 'Closing smtp server');
      _this.emit('close', _session);
    });

    server.on('error', (error) => {
      callback(error);
      if (configuration.port < 1000) {
        logger.error({ context: LOG_CONTEXT }, 'Ports under 1000 require root privileges.');
      }

      logger.error({ err: error, context: LOG_CONTEXT }, 'Server errored');
      _this.emit('error', _session, error);
    });

    callback();
  }

  public stop(callback: () => void) {
    callback = callback || (() => {});
    logger.info({ context: LOG_CONTEXT }, 'Stopping mailin.');

    if (!this._smtp) {
      callback();

      return;
    }

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

function getEnvelopeToAddress(connection) {
  const rcptTo = connection.envelope?.rcptTo;

  if (!rcptTo) {
    return '';
  }

  const toAddressObject = Array.isArray(rcptTo) ? rcptTo[0] : rcptTo;

  return toAddressObject?.address ?? toAddressObject ?? '';
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
