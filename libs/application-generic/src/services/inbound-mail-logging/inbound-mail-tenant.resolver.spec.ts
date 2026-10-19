import { DomainRepository } from '@novu/dal';
import { PinoLogger } from 'nestjs-pino';
import { InboundMailTenantResolver } from './inbound-mail-tenant.resolver';

describe('InboundMailTenantResolver', () => {
  let domainRepository: jest.Mocked<Pick<DomainRepository, 'findByName'>>;
  let pinoLogger: jest.Mocked<PinoLogger>;
  let resolver: InboundMailTenantResolver;

  beforeEach(() => {
    domainRepository = {
      findByName: jest.fn(),
    } as any;
    pinoLogger = {
      setContext: jest.fn(),
      warn: jest.fn(),
    } as any;
    resolver = new InboundMailTenantResolver(domainRepository as unknown as DomainRepository, pinoLogger);
  });

  describe('reply-to addresses', () => {
    it('extracts environmentId and transactionId from the address', async () => {
      const result = await resolver.resolve('parse+txn-nv-e=env_1@reply.novu.co', '<msg-id@example.com>');

      expect(result).toEqual({
        organizationId: '',
        environmentId: 'env_1',
        transactionId: 'txn',
      });
      expect(domainRepository.findByName).not.toHaveBeenCalled();
    });

    it('falls back to a deterministic transactionId when the address is malformed', async () => {
      const result = await resolver.resolve('parse-nv-e=garbage@reply.novu.co', '<msg-id@example.com>');

      expect(result.organizationId).toBe('');
      expect(result.environmentId).toBe('');
      expect(result.transactionId).toBe('msg-id@example.com');
    });
  });

  describe('domain-route addresses', () => {
    it('resolves organization and environment from DomainRepository', async () => {
      domainRepository.findByName.mockResolvedValueOnce({
        _id: 'd_1',
        name: 'customer.com',
        status: 'verified',
        mxRecordConfigured: true,
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        data: {},
      } as any);

      const result = await resolver.resolve('support@customer.com', '<msg-id@example.com>');

      expect(domainRepository.findByName).toHaveBeenCalledWith('customer.com');
      expect(result).toEqual({
        organizationId: 'org_1',
        environmentId: 'env_1',
        transactionId: 'msg-id@example.com',
      });
    });

    it('returns empty tenant when the domain is unknown', async () => {
      domainRepository.findByName.mockResolvedValueOnce(null);

      const result = await resolver.resolve('support@unknown.com', '<msg-id@example.com>');

      expect(result.organizationId).toBe('');
      expect(result.environmentId).toBe('');
      expect(result.transactionId).toBe('msg-id@example.com');
    });

    it('returns empty tenant when the domain is not yet verified', async () => {
      domainRepository.findByName.mockResolvedValueOnce({
        _id: 'd_1',
        name: 'customer.com',
        status: 'pending',
        mxRecordConfigured: true,
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        data: {},
      } as any);

      const result = await resolver.resolve('support@customer.com', '<msg-id@example.com>');

      expect(result.organizationId).toBe('');
      expect(result.environmentId).toBe('');
      expect(result.transactionId).toBe('msg-id@example.com');
    });

    it('returns empty tenant when the domain is verified but MX is not configured', async () => {
      domainRepository.findByName.mockResolvedValueOnce({
        _id: 'd_1',
        name: 'customer.com',
        status: 'verified',
        mxRecordConfigured: false,
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        data: {},
      } as any);

      const result = await resolver.resolve('support@customer.com', '<msg-id@example.com>');

      expect(result.organizationId).toBe('');
      expect(result.environmentId).toBe('');
      expect(result.transactionId).toBe('msg-id@example.com');
    });

    it('does not throw when the DB lookup fails', async () => {
      domainRepository.findByName.mockRejectedValueOnce(new Error('mongo down'));

      const result = await resolver.resolve('support@customer.com', '<msg-id@example.com>');

      expect(result.organizationId).toBe('');
      expect(result.environmentId).toBe('');
      expect(pinoLogger.warn).toHaveBeenCalled();
    });
  });

  it('generates a synthetic transactionId when messageId is missing', async () => {
    domainRepository.findByName.mockResolvedValueOnce(null);

    const result = await resolver.resolve('support@example.com', undefined);

    expect(result.transactionId).toMatch(/^inbound_/);
  });
});
