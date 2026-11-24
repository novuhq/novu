import { BadRequestException } from '@nestjs/common';
import { env } from '../../../config/env';
import { ExpectedDnsRecordDto } from '../dtos/expected-dns-record.dto';

export function getMailServerDomain(): string | undefined {
  return env.MAIL_SERVER_DOMAIN?.replace(/^https?:\/\//i, '').replace(/\/+$/, '') || undefined;
}

export function buildExpectedDnsRecords(domainName: string): ExpectedDnsRecordDto[] {
  const mailServerDomain = getMailServerDomain();

  if (!mailServerDomain) {
    throw new BadRequestException('MAIL_SERVER_DOMAIN is not configured; cannot build DNS records.');
  }

  return [
    {
      type: 'MX',
      name: domainName,
      content: mailServerDomain,
      ttl: 'Auto',
      priority: 10,
    },
  ];
}
