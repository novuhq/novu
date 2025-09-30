import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { createVerify } from 'crypto';
import nodemailer from 'nodemailer';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { SESConfig } from './ses.config';

export class SESEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.SES;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly ses: SESClient;

  constructor(private readonly config: SESConfig) {
    super();
    this.ses = new SESClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  private async sendMail(
    { html, text, to, from, senderName, subject, attachments, cc, bcc, replyTo },
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    const transporter = nodemailer.createTransport({
      SES: { ses: this.ses, aws: { SendRawEmailCommand } },
    });

    return await transporter.sendMail(
      this.transform(bridgeProviderData, {
        to,
        html,
        text,
        subject,
        attachments,
        from: {
          address: from,
          name: senderName,
        },
        cc,
        bcc,
        replyTo,
        ...(this.config.configurationSetName && {
          ses: { ConfigurationSetName: this.config.configurationSetName },
        }),
      }).body
    );
  }

  async sendMessage(
    { html, text, to, from, subject, attachments, cc, bcc, replyTo, senderName }: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const info = await this.sendMail(
      {
        from: from || this.config.from,
        senderName: senderName || this.config.senderName,
        to,
        subject,
        html,
        text,
        attachments: attachments?.map((attachment) => ({
          filename: attachment?.name,
          content: attachment.file,
          contentType: attachment.mime,
          cid: attachment.cid,
          contentDisposition: attachment.disposition ?? (attachment.cid ? 'inline' : undefined),
        })),
        cc,
        bcc,
        replyTo,
      },
      bridgeProviderData
    );

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  getMessageId(body: unknown | unknown[]): string[] {
    const parsedBody = this.jsonParseBody(body);

    if (Array.isArray(parsedBody)) {
      return parsedBody.map((item) => buildMessageId(item));
    }

    return [buildMessageId(parsedBody)];
  }

  private jsonParseBody(body: unknown) {
    // Extract actual webhook data from SNS notification wrapper if present
    let extractedMessage = null;

    // Check if this is an SNS notification containing webhook data
    if (this.isSnsNotificationWithMessage(body)) {
      try {
        // Parse the nested Message field which contains the actual SES webhook data
        extractedMessage = JSON.parse((body as Record<string, unknown>).Message as string);
      } catch {
        throw new Error('Failed to parse SNS Message field');
      }
    }

    return { ...(body as Record<string, unknown>), ...(extractedMessage && { Message: extractedMessage }) };
  }

  parseEventBody(body: unknown | unknown[], _identifier: string): IEmailEventBody | undefined {
    if (!body) {
      return undefined;
    }

    const parsedBody = this.jsonParseBody(body);

    if (!parsedBody || !parsedBody.Message) {
      return undefined;
    }

    const message = parsedBody as Record<string, unknown>;
    const messageData = message.Message as Record<string, unknown>;
    const status = this.getStatus(messageData.eventType as string);

    if (status === undefined) {
      return undefined;
    }

    const mailData = messageData.mail as Record<string, unknown>;

    return {
      status,
      date: new Date(mailData.timestamp as string).toISOString(),
      externalId: mailData.messageId as string,
      row: JSON.stringify(body),
      attempts: undefined,
      response: undefined,
    };
  }

  /**
   * Checks if this is an SNS notification containing a Message field with webhook data
   */
  private isSnsNotificationWithMessage(body: unknown): boolean {
    const snsBody = body as Record<string, unknown>;
    return (
      snsBody?.Type === 'Notification' && typeof snsBody?.Message === 'string' && (snsBody.Message as string).length > 0
    );
  }

  /**
   * The `Subscription` event status is not considered since it is not an action
   * or outcome of the event but the state of the subscriber preferences.
   */
  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'Bounce':
        return EmailEventStatusEnum.BOUNCED;
      case 'Complaint':
        return EmailEventStatusEnum.COMPLAINT;
      case 'Delivery':
        return EmailEventStatusEnum.DELIVERED;
      case 'Send':
        return EmailEventStatusEnum.SENT;
      case 'Reject':
        return EmailEventStatusEnum.REJECTED;
      case 'Open':
        return EmailEventStatusEnum.OPENED;
      case 'Click':
        return EmailEventStatusEnum.CLICKED;
      case 'DeliveryDelay':
        return EmailEventStatusEnum.DELAYED;
      default:
        return undefined;
    }
  }

  async checkIntegration(): Promise<ICheckIntegrationResponse> {
    try {
      await this.sendMail({
        html: '',
        text: 'This is a Test mail to test your Amazon SES integration',
        to: 'no-reply@novu.co',
        from: this.config.from,
        subject: 'Test SES integration',
        attachments: {},
        bcc: [],
        cc: [],
        replyTo: this.config.from,
        senderName: this.config.senderName,
      });

      return {
        success: true,
        message: 'Integrated Successfully',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  async verifySignature({
    rawBody: _rawBody,
    headers = {},
    body,
  }: {
    rawBody: unknown;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // Parse the raw body if it's a string
      const snsMessage = typeof body === 'string' ? JSON.parse(body) : body;

      // Validate that this looks like an SNS message
      if (!this.isValidSnsMessage(snsMessage)) {
        return {
          success: false,
          message: 'Invalid SNS message structure',
        };
      }

      // Check if this is a subscription confirmation or notification
      const messageType = headers['x-amz-sns-message-type'] || (snsMessage as Record<string, unknown>).Type;

      if (!messageType || !['SubscriptionConfirmation', 'Notification'].includes(messageType as string)) {
        return {
          success: false,
          message: `Unsupported SNS message type: ${messageType}`,
        };
      }

      const additionalValidation = this.performAdditionalSecurityChecks(snsMessage as Record<string, unknown>);
      if (!additionalValidation.success) {
        return additionalValidation;
      }

      return await this.verifyCryptographicSignature(snsMessage as Record<string, unknown>);
    } catch (error) {
      return {
        success: false,
        message: `SNS signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validates that the message has the required SNS structure
   */
  private isValidSnsMessage(message: unknown): boolean {
    if (!message || typeof message !== 'object') {
      return false;
    }

    // Required fields for all SNS messages
    const requiredFields = [
      'Type',
      'MessageId',
      'TopicArn',
      'Timestamp',
      'SignatureVersion',
      'Signature',
      'SigningCertURL',
    ];

    return requiredFields.every((field) => message.hasOwnProperty(field));
  }

  /**
   * Performs additional security validation beyond basic signature verification
   * to reduce attack vectors and minimize latency by avoiding AWS SigningCert API calls
   */
  private performAdditionalSecurityChecks(snsMessage: Record<string, unknown>): { success: boolean; message?: string } {
    // Validate timestamp to prevent replay attacks (within 15 minutes)
    const messageTime = new Date(snsMessage.Timestamp as string).getTime();
    const currentTime = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    if (currentTime - messageTime > fifteenMinutes) {
      return {
        success: false,
        message: 'SNS message timestamp is too old (replay attack prevention)',
      };
    }

    // Validate the SigningCertURL is from AWS
    const certUrl = snsMessage.SigningCertURL as string;
    if (!this.isValidAwsCertificateUrl(certUrl)) {
      return {
        success: false,
        message: 'Invalid AWS certificate URL',
      };
    }

    // Validate signature version
    if (snsMessage.SignatureVersion !== '1') {
      return {
        success: false,
        message: `Unsupported signature version: ${snsMessage.SignatureVersion}`,
      };
    }

    // Validate region matches if configured
    if (this.config.region) {
      const topicRegion = this.extractRegionFromTopicArn(snsMessage.TopicArn as string);
      if (topicRegion && topicRegion !== this.config.region) {
        return {
          success: false,
          message: `Topic region ${topicRegion} does not match configured region ${this.config.region}`,
        };
      }
    }

    return {
      success: true,
      message: 'SNS signature verification successful',
    };
  }

  /**
   * Validates that the certificate URL is from AWS
   */
  private isValidAwsCertificateUrl(url: string): boolean {
    if (!url) return false;

    try {
      const parsedUrl = new URL(url);

      // Must be HTTPS
      if (parsedUrl.protocol !== 'https:') {
        return false;
      }

      // Must be from AWS SNS certificate domains - exact matches only to prevent subdomain injection
      const validExactDomains = [
        'sns.amazonaws.com',
        's3.amazonaws.com', // SNS certificates are also served from S3
      ];

      return validExactDomains.includes(parsedUrl.hostname) || this.isValidSnsRegionalEndpoint(parsedUrl.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Validates SNS regional endpoints to prevent subdomain injection attacks
   * Uses comprehensive regex pattern that supports all current and future AWS regions
   * while maintaining security by validating the complete hostname structure
   */
  private isValidSnsRegionalEndpoint(hostname: string): boolean {
    // AWS region patterns:
    const validSnsHostnamePattern =
      /^sns\.((?:[a-z]{2}(?:-gov)?-(?:central|north|south|east|west|northeast|northwest|southeast|southwest)-[1-9])|(?:cn-(?:north|northwest)-1))\.amazonaws\.com$/;

    const match = hostname.match(validSnsHostnamePattern);
    if (!match) {
      return false;
    }

    const region = match[1];

    // Reconstruct expected hostname from validated components and compare exactly
    // This prevents bypass attacks by ensuring exact match
    const expectedHostname = `sns.${region}.amazonaws.com`;
    return hostname === expectedHostname;
  }

  /**
   * Extracts region from SNS Topic ARN
   */
  private extractRegionFromTopicArn(topicArn: string): string | null {
    if (!topicArn) return null;

    // ARN format: arn:aws:sns:region:account-id:topic-name
    const arnParts = topicArn.split(':');
    if (arnParts.length >= 4 && arnParts[0] === 'arn' && arnParts[1] === 'aws' && arnParts[2] === 'sns') {
      return arnParts[3];
    }

    return null;
  }

  private async verifyCryptographicSignature(
    snsMessage: Record<string, unknown>
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { SigningCertURL, Signature, Type } = snsMessage;

      // Download the certificate
      const response = await fetch(SigningCertURL as string);
      if (!response.ok) {
        return { success: false, message: 'Failed to download certificate' };
      }
      const certificate = await response.text();

      // Build the string to sign based on message type
      const stringToSign =
        Type === 'SubscriptionConfirmation'
          ? this.buildSubscriptionStringToSign(snsMessage)
          : this.buildNotificationStringToSign(snsMessage);

      // Verify the signature
      const verify = createVerify('sha1WithRSAEncryption');
      verify.update(stringToSign, 'utf8');
      const isValid = verify.verify(certificate, Signature as string, 'base64');

      return isValid
        ? { success: true, message: 'Cryptographic signature verification successful' }
        : { success: false, message: 'Invalid signature' };
    } catch (error) {
      return {
        success: false,
        message: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private buildNotificationStringToSign(msg: Record<string, unknown>): string {
    const { Message, MessageId, Subject, Timestamp, TopicArn, Type } = msg;
    let str = `Message\n${Message}\nMessageId\n${MessageId}\n`;
    if (Subject) str += `Subject\n${Subject}\n`;
    str += `Timestamp\n${Timestamp}\nTopicArn\n${TopicArn}\nType\n${Type}\n`;
    return str;
  }

  private buildSubscriptionStringToSign(msg: Record<string, unknown>): string {
    const { Message, MessageId, SubscribeURL, Timestamp, Token, TopicArn, Type } = msg;
    return `Message\n${Message}\nMessageId\n${MessageId}\nSubscribeURL\n${SubscribeURL}\nTimestamp\n${Timestamp}\nToken\n${Token}\nTopicArn\n${TopicArn}\nType\n${Type}\n`;
  }
}

function buildMessageId(body: Record<string, unknown>) {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation> x
  if (!(body?.Message as any)?.mail?.messageId) {
    return undefined;
  }

  const message = body.Message as Record<string, unknown>;
  const mailData = message.mail as Record<string, unknown>;

  if (mailData.messageId && mailData.sourceArn) {
    const messageId = mailData.messageId as string;
    // example arn:aws:ses:us-east-1:123456789012:identity/sender@example.com
    const region = (mailData.sourceArn as string).split(':')[3];
    // this is the format of the messageId generated by AWS SES SendEmail API
    return `<${messageId}@${region}.amazonses.com>`;
  }

  throw new Error('Unable to extract message ID from webhook body');
}
