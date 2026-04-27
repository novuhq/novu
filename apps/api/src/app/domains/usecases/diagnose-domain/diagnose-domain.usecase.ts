import { promises as dnsPromises, type MxRecord } from 'node:dns';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
import {
  DomainDiagnosticCheckStatusEnum,
  DomainDiagnosticCodeEnum,
  DomainDiagnosticSeverityEnum,
} from '@novu/shared';

import { DiagnoseDomainResponseDto } from '../../dtos/diagnose-domain-response.dto';
import { getMailServerDomain } from '../../utils/dns-records';
import {
  checkMailServerIpsOnDnsbl,
  isPrivateOrLoopbackIpv4,
  resolveHostnameToIpv4,
  withDnsTimeout,
} from '../../utils/dns-diagnostics';
import { resolveDomainName } from '../domain-route.utils';
import { DiagnoseDomainCommand } from './diagnose-domain.command';

function normalizeMxExchange(exchange: string): string {
  return exchange.replace(/\.$/, '').toLowerCase();
}

function isExpectedDnsLookupMiss(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;

  return code === 'ENOTFOUND' || code === 'ENODATA';
}

@Injectable()
export class DiagnoseDomain {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: DiagnoseDomainCommand): Promise<DiagnoseDomainResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const expectedRaw = getMailServerDomain();

    if (!expectedRaw) {
      throw new BadRequestException('MAIL_SERVER_DOMAIN is not configured; cannot diagnose inbound DNS.');
    }

    const expectedExchange = normalizeMxExchange(expectedRaw);
    const runAt = new Date().toISOString();
    const checks: DiagnoseDomainResponseDto['checks'] = [];
    const issues: DiagnoseDomainResponseDto['issues'] = [];

    const mxResult = await this.runMxChecks(domain.name, expectedExchange, checks, issues);
    await this.runApexCnameCheck(domain.name, checks, issues);
    await this.runDnsblCheck(expectedExchange, checks, issues, mxResult);

    const ok = issues.filter((i) => i.severity === DomainDiagnosticSeverityEnum.ERROR).length === 0;

    return { ok, runAt, checks, issues };
  }

  private async runMxChecks(
    lookupDomain: string,
    expectedExchange: string,
    checks: DiagnoseDomainResponseDto['checks'],
    issues: DiagnoseDomainResponseDto['issues']
  ): Promise<MxRecord[] | null> {
    const resolveStarted = Date.now();
    let records: MxRecord[] = [];

    try {
      records = await withDnsTimeout(dnsPromises.resolveMx(lookupDomain));
    } catch (error) {
      const latencyMs = Date.now() - resolveStarted;

      if (isExpectedDnsLookupMiss(error)) {
        checks.push({
          code: DomainDiagnosticCodeEnum.MX_MISSING,
          status: DomainDiagnosticCheckStatusEnum.FAIL,
          latencyMs,
        });
        issues.push({
          code: DomainDiagnosticCodeEnum.MX_MISSING,
          severity: DomainDiagnosticSeverityEnum.ERROR,
          message: `No MX records were found for ${lookupDomain}.`,
          fix: `Add an MX record pointing to ${expectedExchange} (priority 10 is typical). See Novu inbound email documentation.`,
        });
      } else {
        checks.push({
          code: DomainDiagnosticCodeEnum.MX_MISSING,
          status: DomainDiagnosticCheckStatusEnum.SKIPPED,
          latencyMs,
        });
      }

      checks.push({
        code: DomainDiagnosticCodeEnum.MX_WRONG_TARGET,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: 0,
      });
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_LOW_PRIORITY,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: 0,
      });

      return null;
    }

    const resolveLatency = Date.now() - resolveStarted;

    if (records.length === 0) {
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_MISSING,
        status: DomainDiagnosticCheckStatusEnum.FAIL,
        latencyMs: resolveLatency,
      });
      issues.push({
        code: DomainDiagnosticCodeEnum.MX_MISSING,
        severity: DomainDiagnosticSeverityEnum.ERROR,
        message: `No MX records were found for ${lookupDomain}.`,
        fix: `Add an MX record pointing to ${expectedExchange}.`,
      });
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_WRONG_TARGET,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: 0,
      });
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_LOW_PRIORITY,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: 0,
      });

      return null;
    }

    checks.push({
      code: DomainDiagnosticCodeEnum.MX_MISSING,
      status: DomainDiagnosticCheckStatusEnum.PASS,
      latencyMs: resolveLatency,
    });

    const normalizedRecords = records.map((r) => ({
      ...r,
      exchange: normalizeMxExchange(r.exchange),
    }));

    const targetStarted = Date.now();
    const matchesNovu = normalizedRecords.filter((r) => r.exchange === expectedExchange);

    if (matchesNovu.length === 0) {
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_WRONG_TARGET,
        status: DomainDiagnosticCheckStatusEnum.FAIL,
        latencyMs: Date.now() - targetStarted,
      });
      issues.push({
        code: DomainDiagnosticCodeEnum.MX_WRONG_TARGET,
        severity: DomainDiagnosticSeverityEnum.ERROR,
        message: `MX exists but none point to Novu's mail server (${expectedExchange}).`,
        fix: `Set an MX record for ${lookupDomain} with target ${expectedExchange} and an appropriate priority.`,
      });
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_LOW_PRIORITY,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: 0,
      });

      return records;
    }

    checks.push({
      code: DomainDiagnosticCodeEnum.MX_WRONG_TARGET,
      status: DomainDiagnosticCheckStatusEnum.PASS,
      latencyMs: Date.now() - targetStarted,
    });

    const novuMinPriority = Math.min(...matchesNovu.map((r) => r.priority));
    const globalMinPriority = Math.min(...normalizedRecords.map((r) => r.priority));

    const lowPriStarted = Date.now();

    if (globalMinPriority < novuMinPriority) {
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_LOW_PRIORITY,
        status: DomainDiagnosticCheckStatusEnum.FAIL,
        latencyMs: Date.now() - lowPriStarted,
      });
      issues.push({
        code: DomainDiagnosticCodeEnum.MX_LOW_PRIORITY,
        severity: DomainDiagnosticSeverityEnum.WARN,
        message: 'Another MX record has a better (lower) priority than the Novu MX record.',
        fix: `Either remove higher-priority MX hosts that should not receive mail for this domain, or give ${expectedExchange} the lowest MX priority value.`,
      });
    } else {
      checks.push({
        code: DomainDiagnosticCodeEnum.MX_LOW_PRIORITY,
        status: DomainDiagnosticCheckStatusEnum.PASS,
        latencyMs: Date.now() - lowPriStarted,
      });
    }

    return records;
  }

  private async runApexCnameCheck(
    lookupDomain: string,
    checks: DiagnoseDomainResponseDto['checks'],
    issues: DiagnoseDomainResponseDto['issues']
  ): Promise<void> {
    const started = Date.now();

    try {
      await withDnsTimeout(dnsPromises.resolveCname(lookupDomain));
      checks.push({
        code: DomainDiagnosticCodeEnum.APEX_CNAME_COLLISION,
        status: DomainDiagnosticCheckStatusEnum.FAIL,
        latencyMs: Date.now() - started,
      });
      issues.push({
        code: DomainDiagnosticCodeEnum.APEX_CNAME_COLLISION,
        severity: DomainDiagnosticSeverityEnum.ERROR,
        message: `The apex name ${lookupDomain} has a CNAME record. CNAME cannot coexist with MX at the zone apex.`,
        fix: 'Remove the CNAME at the apex or use a subdomain for the CNAME target; MX must be authoritative for the mail domain.',
      });
    } catch (error) {
      if (isExpectedDnsLookupMiss(error)) {
        checks.push({
          code: DomainDiagnosticCodeEnum.APEX_CNAME_COLLISION,
          status: DomainDiagnosticCheckStatusEnum.PASS,
          latencyMs: Date.now() - started,
        });

        return;
      }

      checks.push({
        code: DomainDiagnosticCodeEnum.APEX_CNAME_COLLISION,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: Date.now() - started,
      });
    }
  }

  private async runDnsblCheck(
    expectedExchange: string,
    checks: DiagnoseDomainResponseDto['checks'],
    issues: DiagnoseDomainResponseDto['issues'],
    mxRecords: MxRecord[] | null
  ): Promise<void> {
    const started = Date.now();

    if (!mxRecords) {
      checks.push({
        code: DomainDiagnosticCodeEnum.DNSBL_LISTED,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: Date.now() - started,
      });

      return;
    }

    const ips = await resolveHostnameToIpv4(expectedExchange);

    if (ips.length === 0) {
      checks.push({
        code: DomainDiagnosticCodeEnum.DNSBL_LISTED,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: Date.now() - started,
      });

      return;
    }

    if (ips.every((ip) => isPrivateOrLoopbackIpv4(ip))) {
      checks.push({
        code: DomainDiagnosticCodeEnum.DNSBL_LISTED,
        status: DomainDiagnosticCheckStatusEnum.SKIPPED,
        latencyMs: Date.now() - started,
      });

      return;
    }

    const listed = await checkMailServerIpsOnDnsbl(ips);

    if (listed.length > 0) {
      checks.push({
        code: DomainDiagnosticCodeEnum.DNSBL_LISTED,
        status: DomainDiagnosticCheckStatusEnum.FAIL,
        latencyMs: Date.now() - started,
      });
      const detail = listed.map((l) => `${l.ip} on ${l.zone}`).join('; ');
      issues.push({
        code: DomainDiagnosticCodeEnum.DNSBL_LISTED,
        severity: DomainDiagnosticSeverityEnum.WARN,
        message: `The inbound mail host ${expectedExchange} appears on one or more DNS blocklists (${detail}).`,
        fix: 'Work with your mail infrastructure provider to delist or rotate IPs if this is a false positive.',
      });
    } else {
      checks.push({
        code: DomainDiagnosticCodeEnum.DNSBL_LISTED,
        status: DomainDiagnosticCheckStatusEnum.PASS,
        latencyMs: Date.now() - started,
      });
    }
  }
}
