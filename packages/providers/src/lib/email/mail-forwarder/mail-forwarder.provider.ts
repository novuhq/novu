import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { Storage } from '@google-cloud/storage';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import { WithPassthrough } from '../../../utils/types';
import { BaseProvider, CasingEnum } from '../../../base.provider';

interface IMailForwarderConfig {
  MAIL_FORWARDER_BUCKET: string;
  GCP_PROJECT_ID?: string;
  GCP_SERVICE_ACCOUNT_KEY_PATH?: string;
  SERVICE_ACCOUNT_IDENTITY: string;
  senderEmail?: string;
  senderName?: string;
  defaultFrom?: string;
}

export class MailForwarderProvider extends BaseProvider implements IEmailProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = 'mail-forwarder' as EmailProviderIdEnum;
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private storage: Storage;
  private config: IMailForwarderConfig;

  constructor(credentials: IMailForwarderConfig) {
    super();

    // Validate required config
    if (!credentials.MAIL_FORWARDER_BUCKET) {
      throw new Error('MAIL_FORWARDER_BUCKET is required');
    }
    if (!credentials.SERVICE_ACCOUNT_IDENTITY) {
      throw new Error('SERVICE_ACCOUNT_IDENTITY is required');
    }

    this.config = credentials;

    /*
     * Initialize GCS client
     * Uses Application Default Credentials (ADC) in production
     * For local development, set STORAGE_EMULATOR_HOST env var
     */
    const storageOptions: ConstructorParameters<typeof Storage>[0] = {
      projectId: credentials.GCP_PROJECT_ID,
    };

    if (credentials.GCP_SERVICE_ACCOUNT_KEY_PATH) {
      storageOptions.keyFilename = credentials.GCP_SERVICE_ACCOUNT_KEY_PATH;
    }

    this.storage = new Storage(storageOptions);
  }

  /**
   * Normalize recipient field to array format
   */
  private normalizeRecipients(recipients: string | string[] | undefined): string[] {
    if (!recipients) {
      return [];
    }
    if (Array.isArray(recipients)) {
      return recipients;
    }

    return [recipients];
  }

  /**
   * Check integration by verifying bucket access
   * FIX: Use non-destructive check instead of write/delete
   */
  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      const bucket = this.storage.bucket(this.config.MAIL_FORWARDER_BUCKET);

      // Check if bucket exists and we have access
      const [exists] = await bucket.exists();

      if (!exists) {
        return {
          success: false,
          message: `Bucket '${this.config.MAIL_FORWARDER_BUCKET}' does not exist or is not accessible`,
          code: CheckIntegrationResponseEnum.FAILED,
        };
      }

      // Verify we can read bucket metadata (validates permissions)
      await bucket.getMetadata();

      return {
        success: true,
        message: 'Mail Forwarder integration successful! Bucket is accessible.',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Mail Forwarder integration failed: ${err?.message ?? 'Unknown error'}`,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    try {
      /*
       * FIX: Removed unused transformed variable
       * If passthrough data is needed in future, it can be re-added
       */

      // Validate required fields
      if (!options.to || (Array.isArray(options.to) && options.to.length === 0)) {
        throw new Error('At least one recipient (to) is required');
      }

      const subjectPlain = options.subject ?? '';
      const bodyHtml = options.html ?? '';
      const bodyText = options.text ?? '';

      if (!subjectPlain) {
        throw new Error('Subject is required');
      }
      if (!bodyHtml && !bodyText) {
        throw new Error('Email body (html or text) is required');
      }

      /*
       * From address: integration config only - no workflow override allowed
       * Cloud Mail Forwarder sender is controlled by integration credentials for security
       * Priority: config.senderEmail -> config.defaultFrom -> hardcoded default
       */
      const fromAddress = this.config.senderEmail ?? this.config.defaultFrom ?? 'GCPEmailGateway@dunnhumby.com';

      const identity = this.config.SERVICE_ACCOUNT_IDENTITY;

      // Normalize recipients to arrays
      const toArray = this.normalizeRecipients(options.to);
      const ccArray = this.normalizeRecipients(options.cc);
      const bccArray = this.normalizeRecipients(options.bcc);

      // Build Mail Forwarder payload
      const message = {
        message: {
          from: fromAddress,
          sender: fromAddress,
          to: toArray,
          cc: ccArray,
          bcc: bccArray,
          subject: Buffer.from(subjectPlain).toString('base64'),
          body: bodyHtml ? Buffer.from(bodyHtml).toString('base64') : Buffer.from(bodyText).toString('base64'),
          bodyContentType: bodyHtml ? 'HTML' : 'Text',
          identity,
          attachments: (options.attachments ?? []).map((attachment: any) => {
            const name = attachment.filename ?? attachment.name ?? 'attachment';

            /*
             * FIX: IAttachmentOptions uses 'file' property, not 'content'
             * The 'file' property is of type Buffer | null
             */
            let contentBytes: string;
            const fileData = attachment.file ?? attachment.content; // Support both for backwards compatibility

            if (fileData) {
              if (typeof fileData === 'string') {
                contentBytes = Buffer.from(fileData).toString('base64');
              } else if (Buffer.isBuffer(fileData)) {
                contentBytes = fileData.toString('base64');
              } else {
                contentBytes = Buffer.from(String(fileData)).toString('base64');
              }
            } else {
              throw new Error(`Attachment "${name}" is missing file data`);
            }

            return {
              name,
              contentBytes,
            };
          }),
        },
      };

      /*
       * Generate unique filename per Cloud Mail Forwarder v2 spec
       * Pattern: dhsmart-email-{uuid}.json for bucket lifecycle policies
       */
      const objectName = `dhsmart-email-${uuidv4()}.json`;
      const bucket = this.storage.bucket(this.config.MAIL_FORWARDER_BUCKET);
      const file = bucket.file(objectName);

      console.log('[MailForwarder] Uploading email:', {
        bucket: this.config.MAIL_FORWARDER_BUCKET,
        filename: objectName,
        recipients: toArray.length,
      });

      // Upload to GCS
      await file.save(JSON.stringify(message, null, 2), {
        resumable: false,
        contentType: 'application/json',
        metadata: {
          source: 'novu',
          timestamp: new Date().toISOString(),
          to: toArray.join(','),
          subject: subjectPlain,
        },
      });

      return {
        id: objectName,
        date: new Date().toISOString(),
      };
    } catch (err: any) {
      const errorMessage = `Failed to send email via Mail Forwarder: ${err?.message ?? 'Unknown error'}`;
      console.error(errorMessage, {
        error: err,
        to: options.to,
        subject: options.subject,
      });
      throw new Error(errorMessage);
    }
  }
}

/**
 * MailForwarderProvider: Custom Novu provider for Cloud Mail Forwarder v2
 *
 * FEATURES:
 * - Non-destructive bucket check (no test file creation)
 * - Dynamic 'from' address support with secure fallback to integration config
 * - Uses 'dhsmart-email-{uuid}.json' naming convention per Cloud Mail Forwarder v2 spec
 * - Handles IAttachmentOptions.file property correctly
 *
 * Configuration:
 * {
 *   "MAIL_FORWARDER_BUCKET": "dev-euw1-internal-mail-forwarder-email",  // Required
 *   "SERVICE_ACCOUNT_IDENTITY": "your-sa@project.iam.gserviceaccount.com",  // Required
 *   "GCP_PROJECT_ID": "dh-cscore-shared-services",  // Optional
 *   "GCP_SERVICE_ACCOUNT_KEY_PATH": "/path/to/key.json",  // Optional
 *   "senderEmail": "GCPEmailGateway@dunnhumby.com",  // Optional - default sender
 *   "defaultFrom": "GCPEmailGateway@dunnhumby.com"  // Optional - fallback sender
 * }
 *
 * From Address Priority:
 * 1. config.senderEmail (integration level) - primary sender
 * 2. config.defaultFrom (fallback)
 * 3. 'GCPEmailGateway@dunnhumby.com' (hardcoded default)
 * Note: options.from is not used - sender is always controlled by integration config
 */
