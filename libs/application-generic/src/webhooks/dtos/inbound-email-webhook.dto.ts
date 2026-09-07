import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { InboundEmailAttachment } from '@novu/shared';

export class InboundEmailWebhookDomainDto {
  @ApiProperty({ description: 'Database identifier of the domain that received the email' })
  id: string;

  @ApiProperty({ description: 'Domain name, for example `mail.yourcompany.com`' })
  name: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Custom data configured on the domain',
  })
  data: Record<string, string>;
}

export class InboundEmailWebhookRouteDto {
  @ApiProperty({ description: 'Route address, meaning the local part of the receiving email address' })
  address: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Custom data configured on the route, for example a tenant identifier',
  })
  data: Record<string, string>;
}

export class InboundEmailWebhookAddressDto {
  @ApiProperty({ description: 'Email address' })
  address: string;

  @ApiProperty({ description: 'Display name' })
  name: string;
}

export class InboundEmailWebhookAttachmentContentDto {
  @ApiProperty({ enum: ['Buffer'], description: 'Legacy Node.js buffer marker' })
  type: 'Buffer';

  @ApiProperty({ type: [Number], description: 'Raw attachment bytes' })
  data: number[];
}

export class InboundEmailWebhookAttachmentDto implements InboundEmailAttachment {
  @ApiProperty({ description: 'File name of the attachment' })
  filename: string;

  @ApiProperty({ description: 'MIME type of the attachment' })
  contentType: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiPropertyOptional({
    description:
      'Presigned download URL. Absent on self-hosted deployments without S3, where `content` carries the bytes instead.',
  })
  url?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'ISO timestamp when `url` stops being valid. Present when Novu signed the URL for webhook delivery.',
  })
  expiresAt?: string;

  @ApiPropertyOptional({
    type: () => InboundEmailWebhookAttachmentContentDto,
    nullable: true,
    description:
      'Deprecated, use `url`. Raw content in the legacy `{ type: "Buffer", data: number[] }` format, or `null` when rehydration failed.',
  })
  content?: InboundEmailAttachment['content'];

  @ApiPropertyOptional({ description: 'Deprecated, use `size`' })
  contentBytes?: number;
}

export class InboundEmailWebhookMailDto {
  @ApiProperty({ type: [InboundEmailWebhookAddressDto], description: 'Sender addresses' })
  from: InboundEmailWebhookAddressDto[];

  @ApiProperty({ type: [InboundEmailWebhookAddressDto], description: 'Recipient addresses' })
  to: InboundEmailWebhookAddressDto[];

  @ApiProperty({ description: 'Email subject' })
  subject: string;

  @ApiProperty({ description: 'HTML body' })
  html: string;

  @ApiProperty({ description: 'Plain text body' })
  text: string;

  @ApiProperty({ description: 'Value of the `Message-ID` header' })
  messageId: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    description: 'Raw mail headers, keyed by lowercase header name',
  })
  headers: Record<string, string | string[]>;

  @ApiProperty({ type: 'string', format: 'date-time', description: 'Timestamp taken from the `Date` header' })
  date: string;

  @ApiPropertyOptional({ description: 'Value of the `In-Reply-To` header, set on replies' })
  inReplyTo?: string;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'Value of the `References` header, delivered as a single value or a list depending on the sender',
  })
  references?: string | string[];

  @ApiPropertyOptional({
    type: [InboundEmailWebhookAddressDto],
    description: 'Carbon copy addresses, when the sender set any',
  })
  cc?: InboundEmailWebhookAddressDto[];

  @ApiPropertyOptional({
    type: [InboundEmailWebhookAddressDto],
    description: 'Matched SMTP envelope recipient when it is absent from the To and Cc headers. Omitted otherwise.',
  })
  bcc?: InboundEmailWebhookAddressDto[];

  @ApiProperty({ type: [InboundEmailWebhookAttachmentDto], description: 'Attachments found on the email' })
  attachments: InboundEmailWebhookAttachmentDto[];
}

export class InboundEmailWebhookObjectDto {
  @ApiProperty({ type: () => InboundEmailWebhookDomainDto })
  domain: InboundEmailWebhookDomainDto;

  @ApiProperty({ type: () => InboundEmailWebhookRouteDto })
  route: InboundEmailWebhookRouteDto;

  @ApiProperty({ type: () => InboundEmailWebhookMailDto })
  mail: InboundEmailWebhookMailDto;
}

export class InboundEmailWebhookPayloadDto {
  @ApiProperty({ type: () => InboundEmailWebhookObjectDto })
  object: InboundEmailWebhookObjectDto;
}
