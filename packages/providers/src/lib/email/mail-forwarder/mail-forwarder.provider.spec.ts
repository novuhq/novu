import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CheckIntegrationResponseEnum } from '@novu/stateless';
import { MailForwarderProvider } from './mail-forwarder.provider';

// Create mock functions that we can control per test
let mockSave: any;
let mockExists: any;
let mockGetMetadata: any;
let mockFile: any;
let mockBucket: any;

// Mock GCS Storage
vi.mock('@google-cloud/storage', () => {
  return {
    Storage: vi.fn(() => ({
      bucket: vi.fn((bucketName) => {
        // Return the mock bucket that tests can control
        return {
          file: mockFile,
          exists: mockExists,
          getMetadata: mockGetMetadata,
        };
      }),
    })),
  };
});

describe('MailForwarderProvider', () => {
  let provider: MailForwarderProvider;

  beforeEach(() => {
    // Reset mocks before each test
    mockSave = vi.fn().mockResolvedValue(undefined);
    mockExists = vi.fn().mockResolvedValue([true]);
    mockGetMetadata = vi.fn().mockResolvedValue([{ name: 'test-bucket' }]);
    mockFile = vi.fn(() => ({
      save: mockSave,
    }));

    provider = new MailForwarderProvider({
      MAIL_FORWARDER_BUCKET: 'test-bucket',
      GCP_PROJECT_ID: 'test-project',
      SERVICE_ACCOUNT_IDENTITY: 'test-sa@project.iam.gserviceaccount.com',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should be defined', () => {
      expect(provider).toBeDefined();
    });

    it('should have correct provider id', () => {
      expect(provider.id).toBe('mail-forwarder');
    });

    it('should throw error if MAIL_FORWARDER_BUCKET is missing', () => {
      expect(() => {
        new MailForwarderProvider({
          MAIL_FORWARDER_BUCKET: '',
          GCP_PROJECT_ID: 'test-project',
          SERVICE_ACCOUNT_IDENTITY: 'test-sa@project.iam.gserviceaccount.com',
        });
      }).toThrow('MAIL_FORWARDER_BUCKET is required');
    });

    it('should throw error if SERVICE_ACCOUNT_IDENTITY is missing', () => {
      expect(() => {
        new MailForwarderProvider({
          MAIL_FORWARDER_BUCKET: 'test-bucket',
          GCP_PROJECT_ID: 'test-project',
          SERVICE_ACCOUNT_IDENTITY: '',
        });
      }).toThrow('SERVICE_ACCOUNT_IDENTITY is required');
    });
  });

  describe('checkIntegration', () => {
    it('should check integration successfully when bucket exists', async () => {
      const result = await provider.checkIntegration({
        to: ['test@dunnhumby.com'],
        subject: 'test',
        html: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.code).toBe(CheckIntegrationResponseEnum.SUCCESS);
      expect(result.message).toContain('successful');
      expect(mockExists).toHaveBeenCalled();
      expect(mockGetMetadata).toHaveBeenCalled();
    });

    it('should fail when bucket does not exist', async () => {
      // Override the mock for this test
      mockExists.mockResolvedValueOnce([false]);

      const result = await provider.checkIntegration({
        to: ['test@dunnhumby.com'],
        subject: 'test',
        html: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe(CheckIntegrationResponseEnum.FAILED);
      expect(result.message).toContain('does not exist or is not accessible');
    });

    it('should fail when getMetadata throws permission error', async () => {
      // Override the mock for this test
      mockGetMetadata.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await provider.checkIntegration({
        to: ['test@dunnhumby.com'],
        subject: 'test',
        html: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe(CheckIntegrationResponseEnum.FAILED);
      expect(result.message).toContain('Permission denied');
    });
  });

  describe('sendMessage', () => {
    it('should upload JSON to bucket with correct filename pattern', async () => {
      const result = await provider.sendMessage({
        to: ['a@b.com'],
        subject: 'Test Subject',
        html: '<b>Hello World</b>',
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
      expect(result.date).toBeDefined();
      expect(new Date(result.date)).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error if recipient is missing', async () => {
      await expect(
        provider.sendMessage({
          to: [],
          subject: 'Test',
          html: 'Test',
        })
      ).rejects.toThrow('At least one recipient (to) is required');
    });

    it('should throw error if subject is missing', async () => {
      await expect(
        provider.sendMessage({
          to: ['test@dunnhumby.com'],
          subject: '',
          html: 'Test body',
        })
      ).rejects.toThrow('Subject is required');
    });

    it('should throw error if body is missing', async () => {
      await expect(
        provider.sendMessage({
          to: ['test@dunnhumby.com'],
          subject: 'Test Subject',
          html: '',
          text: '',
        })
      ).rejects.toThrow('Email body (html or text) is required');
    });

    it('should handle single recipient string', async () => {
      const result = await provider.sendMessage({
        to: ['single@dunnhumby.com'],
        subject: 'Test',
        html: 'Test',
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
    });

    it('should handle CC and BCC recipients', async () => {
      const result = await provider.sendMessage({
        to: ['primary@dunnhumby.com'],
        cc: ['cc@dunnhumby.com'],
        bcc: ['bcc@dunnhumby.com'],
        subject: 'Test',
        html: 'Test',
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
    });

    it('should handle plain text body', async () => {
      const result = await provider.sendMessage({
        to: ['test@dunnhumby.com'],
        subject: 'Test',
        html: 'Plain text body',
        text: 'Plain text body',
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
    });

    it('should handle attachments', async () => {
      const attachmentContent = Buffer.from('Test file content');

      const result = await provider.sendMessage({
        to: ['test@dunnhumby.com'],
        subject: 'Test with Attachment',
        html: '<p>See attachment</p>',
        attachments: [
          {
            name: 'test.txt',
            file: attachmentContent,
            mime: 'text/plain',
          },
        ],
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
    });

    it('should throw error if attachment is missing file data', async () => {
      await expect(
        provider.sendMessage({
          to: ['test@dunnhumby.com'],
          subject: 'Test',
          html: 'Test',
          attachments: [
            {
              name: 'test.txt',
              file: undefined as unknown as Buffer,
              mime: 'text/plain',
            },
          ],
        })
      ).rejects.toThrow('missing file data');
    });
  });

  describe('Sender Policy', () => {
    it('should use configured senderEmail', async () => {
      const providerWithSender = new MailForwarderProvider({
        MAIL_FORWARDER_BUCKET: 'test-bucket',
        GCP_PROJECT_ID: 'test-project',
        SERVICE_ACCOUNT_IDENTITY: 'test-sa@project.iam.gserviceaccount.com',
        senderEmail: 'configured@dunnhumby.com',
      });

      const result = await providerWithSender.sendMessage({
        to: ['recipient@dunnhumby.com'],
        subject: 'Test',
        html: 'Test',
        from: 'ignored@dunnhumby.com',
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
    });

    it('should fall back to defaultFrom if senderEmail not set', async () => {
      const providerWithDefault = new MailForwarderProvider({
        MAIL_FORWARDER_BUCKET: 'test-bucket',
        GCP_PROJECT_ID: 'test-project',
        SERVICE_ACCOUNT_IDENTITY: 'test-sa@project.iam.gserviceaccount.com',
        defaultFrom: 'default@dunnhumby.com',
      });

      const result = await providerWithDefault.sendMessage({
        to: ['recipient@dunnhumby.com'],
        subject: 'Test',
        html: 'Test',
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
    });

    it('should use hardcoded default if no sender config provided', async () => {
      const result = await provider.sendMessage({
        to: ['recipient@dunnhumby.com'],
        subject: 'Test',
        html: 'Test',
      });

      expect(result.id).toMatch(/^dhsmart-email-.*\.json$/);
    });
  });

  describe('Base64 Encoding', () => {
    it('should encode subject and body in base64', async () => {
      await provider.sendMessage({
        to: ['test@dunnhumby.com'],
        subject: 'Test Subject',
        html: '<h1>Test Body</h1>',
      });

      // Verify mockSave was called
      expect(mockSave).toHaveBeenCalled();

      // Get the first argument (the JSON string) from the first call
      const savedContent = mockSave.mock.calls[0][0];
      const parsedContent = JSON.parse(savedContent);

      // Verify base64 encoding
      expect(parsedContent.message.subject).toBe(Buffer.from('Test Subject').toString('base64'));
      expect(parsedContent.message.body).toBe(Buffer.from('<h1>Test Body</h1>').toString('base64'));
    });
  });

  describe('Error Handling', () => {
    it('should throw descriptive error on GCS upload failure', async () => {
      // Override mock to throw error
      mockSave.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        provider.sendMessage({
          to: ['test@dunnhumby.com'],
          subject: 'Test',
          html: 'Test',
        })
      ).rejects.toThrow('Failed to send email via Mail Forwarder: Network error');
    });
  });
});
