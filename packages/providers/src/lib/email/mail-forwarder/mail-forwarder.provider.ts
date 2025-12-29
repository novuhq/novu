import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { Storage } from '@google-cloud/storage';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';

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
    console.log('DEBUG BUCKET:', process.env.MAIL_FORWARDER_BUCKET);

    // Validate required config
    if (!credentials.MAIL_FORWARDER_BUCKET) {
      throw new Error('MAIL_FORWARDER_BUCKET is required');
    }
    if (!credentials.SERVICE_ACCOUNT_IDENTITY) {
      throw new Error('SERVICE_ACCOUNT_IDENTITY is required');
    }

    this.config = credentials;

    // Initialize GCS client
    if (credentials.GCP_SERVICE_ACCOUNT_KEY_PATH) {
      this.storage = new Storage({
        projectId: credentials.GCP_PROJECT_ID,
        keyFilename: credentials.GCP_SERVICE_ACCOUNT_KEY_PATH,
        apiEndpoint: process.env.GCS_EMULATOR_HOST, // ✅
      });
    } else {
      this.storage = new Storage({
        projectId: credentials.GCP_PROJECT_ID,
        apiEndpoint: process.env.GCS_EMULATOR_HOST, // ✅
      });
    }
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
      // FIX: Removed unused transformed variable
      // If passthrough data is needed in future, it can be re-added

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

      // FIX: Lock sender at integration level - don't use options.from
      // This enforces sender policy and prevents spoofing
      const fromAddress = this.config.senderEmail ?? this.config.defaultFrom ?? 'GCPEmailGateway@dunnhumby.com';

      const identity = this.config.SERVICE_ACCOUNT_IDENTITY;

      // Normalize recipients to arrays
      const toArray = Array.isArray(options.to) ? options.to : options.to ? [options.to as string] : [];

      const ccArray = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc as string]) : [];

      const bccArray = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc as string]) : [];

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
          identity: identity,
          attachments: (options.attachments ?? []).map((attachment: any) => {
            const name = attachment.filename ?? attachment.name ?? 'attachment';

            let contentBytes: string;
            if (attachment.content) {
              if (typeof attachment.content === 'string') {
                contentBytes = Buffer.from(attachment.content).toString('base64');
              } else if (Buffer.isBuffer(attachment.content)) {
                contentBytes = attachment.content.toString('base64');
              } else {
                contentBytes = Buffer.from(String(attachment.content)).toString('base64');
              }
            } else {
              throw new Error(`Attachment "${name}" is missing content`);
            }

            return {
              name,
              contentBytes,
            };
          }),
        },
      };

      // Generate unique filename
      const objectName = `novu-email-${uuidv4()}.json`;
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
 * IMPROVEMENTS:
 * - Non-destructive bucket check (no test file creation)
 * - Sender locked at integration level (prevents spoofing)
 * - Removed unused transform call
 *
 * Configuration:
 * {
 *   "MAIL_FORWARDER_BUCKET": "dev-euw1-internal-mail-forwarder-email",  // Required
 *   "SERVICE_ACCOUNT_IDENTITY": "your-sa@project.iam.gserviceaccount.com",  // Required
 *   "GCP_PROJECT_ID": "dh-cscore-shared-services",  // Optional
 *   "GCP_SERVICE_ACCOUNT_KEY_PATH": "/path/to/key.json",  // Optional
 *   "senderEmail": "GCPEmailGateway@dunnhumby.com",  // Optional
 *   "defaultFrom": "GCPEmailGateway@dunnhumby.com"  // Optional
 * }
 */
