import { ArgumentMetadata } from '@nestjs/common';
import { ShortIsPrefixEnum } from '@novu/shared';
import { expect } from 'chai';
import { encodeBase62 } from '../utils/base62';
import { buildSlug } from '../utils/build-slug';
import { ParseSlugIdPipe } from './parse-slug-id.pipe';

describe('ParseSlugIdPipe', () => {
  let pipe: ParseSlugIdPipe;

  beforeEach(() => {
    pipe = new ParseSlugIdPipe();
  });

  describe('MongoDB ObjectIds', () => {
    it('should return MongoDB ObjectIds unchanged', () => {
      const internalId = '6615943e7ace93b0540ae377';
      expect(pipe.transform(internalId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should handle ObjectIds with leading zeros', () => {
      const internalId = '0615943e7ace93b0540ae377';
      expect(pipe.transform(internalId, {} as ArgumentMetadata)).to.equal(internalId);
    });
  });

  describe('Short resource identifiers', () => {
    it('should return short workflow identifiers unchanged', () => {
      const identifier = 'welcome-email';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });

    it('should return short template identifiers unchanged', () => {
      const identifier = 'email-template';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });

    it('should return short topic identifiers unchanged', () => {
      const identifier = 'newsletter';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });

    it('should return short integration identifiers unchanged', () => {
      const identifier = 'sendgrid-prod';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });
  });

  describe('Slug IDs with various prefixes', () => {
    it('should decode workflow slug IDs', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const slugId = `welcome-email_wf_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode step slug IDs', () => {
      const internalId = '507f1f77bcf86cd799439011';
      const encodedId = encodeBase62(internalId);
      const slugId = `email-template_st_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode environment slug IDs', () => {
      const internalId = '507f191e810c19729de860ea';
      const encodedId = encodeBase62(internalId);
      const slugId = `production-env_env_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode layout slug IDs', () => {
      const internalId = '65f1234567890abcdef12345';
      const encodedId = encodeBase62(internalId);
      const slugId = `default-layout_lt_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode slug IDs produced by buildSlug', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const slugId = buildSlug('my-custom-resource', ShortIsPrefixEnum.WORKFLOW, internalId);

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });
  });

  describe('Internal IDs with leading zeros in slug format', () => {
    it('should handle decoded IDs with leading zeros', () => {
      const internalIds = ['6615943e7ace93b0540ae377', '0615943e7ace93b0540ae377', '0015943e7ace93b0540ae377'];

      internalIds.forEach((internalId) => {
        const slugId = buildSlug('resource', ShortIsPrefixEnum.WORKFLOW, internalId);
        expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
      });
    });
  });

  describe('Invalid or malformed inputs', () => {
    it('should return invalid slug IDs unchanged', () => {
      const invalidSlugId = 'my-resource_invalidEncoding';
      expect(pipe.transform(invalidSlugId, {} as ArgumentMetadata)).to.equal(invalidSlugId);
    });

    it('should return malformed slug IDs unchanged', () => {
      const malformedSlugId = 'resource_bad_encoding123';
      expect(pipe.transform(malformedSlugId, {} as ArgumentMetadata)).to.equal(malformedSlugId);
    });

    it('should handle empty strings', () => {
      expect(pipe.transform('', {} as ArgumentMetadata)).to.equal('');
    });

    it('should handle undefined values', () => {
      expect(pipe.transform(undefined as any, {} as ArgumentMetadata)).to.equal(undefined);
    });

    it('should handle null values', () => {
      expect(pipe.transform(null as any, {} as ArgumentMetadata)).to.equal(null);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long resource names in slug format', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const longResourceName = 'very-long-resource-name-that-exceeds-normal-length';
      const slugId = buildSlug(longResourceName, ShortIsPrefixEnum.WORKFLOW, internalId);

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should handle resource names with special characters', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const slugId = buildSlug('resource-with-dashes_and_underscores', ShortIsPrefixEnum.WORKFLOW, internalId);

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should prioritize exact matches over decoding attempts', () => {
      // If a value looks like it could be decoded but is actually a valid short identifier
      const shortIdentifier = 'exactly-15-chars'; // 15 characters, less than ENCODED_ID_LENGTH
      expect(pipe.transform(shortIdentifier, {} as ArgumentMetadata)).to.equal(shortIdentifier);
    });
  });

  /**
   * Regression: prior implementation blindly base62-decoded the trailing 16
   * characters of any input ≥ 16 chars long. For user-supplied workflow IDs
   * whose last 16 characters were pure alphanumeric, this produced a
   * 24-character hex string that accidentally matched the Mongo ObjectId
   * pattern, and the value was returned as if it were an internal id —
   * causing GET /v2/workflows/{workflowId} to 404 for code-based workflows.
   *
   * The fix only attempts decoding when the input matches the slug shape
   * `<name>_<prefix>_<16 base62 chars>` produced by `buildSlug`.
   */
  describe('User-supplied workflow IDs that resemble base62 trailers', () => {
    it('should NOT mangle long code-based workflow IDs whose last 16 chars are pure base62', () => {
      // Exact ID reported by the customer in Plain thread T-3568.
      // Last 16 chars are "ctedWithoutReaso" — pure base62, no underscore separator,
      // therefore must NOT be decoded.
      const customerWorkflowId = 'UP018A_CompanyConnectionRejectedWithoutReaso';
      expect(pipe.transform(customerWorkflowId, {} as ArgumentMetadata)).to.equal(customerWorkflowId);
    });

    it('should NOT mangle workflow IDs whose trailing 16 chars decode to a valid-looking ObjectId', () => {
      // 16 base62 chars at the tail with NO `_<prefix>_` separator before them.
      // Even though decoding would produce a 24-hex string, the input is not a
      // slug and must be returned untouched.
      const workflowId = 'MyWorkflowAbCdEfGhIjKlMnOp';
      expect(pipe.transform(workflowId, {} as ArgumentMetadata)).to.equal(workflowId);
    });

    it('should NOT mangle workflow IDs whose trailing chars are camelCase only', () => {
      const workflowId = 'orderConfirmationEmailNotification';
      expect(pipe.transform(workflowId, {} as ArgumentMetadata)).to.equal(workflowId);
    });

    it('should still decode well-formed slugs even when the resource name resembles a workflow id', () => {
      // Sanity check: real slugs continue to work after the fix.
      const internalId = '6615943e7ace93b0540ae377';
      const slugId = buildSlug('UP018A_CompanyConnectionRejectedWithoutReaso', ShortIsPrefixEnum.WORKFLOW, internalId);
      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should NOT mangle user workflow IDs that accidentally contain a slug-like suffix', () => {
      const workflowIds = [
        'MyWorkflow_wf_1111111111111111',
        'Customer_wf_F5vfLCrwMT1pf4Uv',
        'my-workflow_wf_not-a-real-encoded-id',
      ];

      workflowIds.forEach((workflowId) => {
        expect(pipe.transform(workflowId, {} as ArgumentMetadata)).to.equal(workflowId);
      });
    });
  });
});
