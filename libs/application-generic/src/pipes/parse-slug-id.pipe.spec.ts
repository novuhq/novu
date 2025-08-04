import { ArgumentMetadata } from '@nestjs/common';
import { expect } from 'chai';
import { encodeBase62 } from '../utils/base62';
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

    it('should decode template slug IDs', () => {
      const internalId = '507f1f77bcf86cd799439011';
      const encodedId = encodeBase62(internalId);
      const slugId = `email-template_et_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode topic slug IDs', () => {
      const internalId = '507f191e810c19729de860ea';
      const encodedId = encodeBase62(internalId);
      const slugId = `newsletter-subscribers_tp_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode integration slug IDs', () => {
      const internalId = '65f1234567890abcdef12345';
      const encodedId = encodeBase62(internalId);
      const slugId = `sendgrid-production_ig_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode slug IDs with any prefix format', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const slugId = `my-custom-resource_cr_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });
  });

  describe('Internal IDs with leading zeros in slug format', () => {
    it('should handle decoded IDs with leading zeros', () => {
      const internalIds = ['6615943e7ace93b0540ae377', '0615943e7ace93b0540ae377', '0015943e7ace93b0540ae377'];

      internalIds.forEach((internalId) => {
        const encodedId = encodeBase62(internalId);
        const slugId = `resource_prefix_${encodedId}`;
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
      const encodedId = encodeBase62(internalId);
      const longResourceName = 'very-long-resource-name-that-exceeds-normal-length';
      const slugId = `${longResourceName}_prefix_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should handle resource names with special characters', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const specialResourceName = 'resource-with-dashes_and_underscores';
      const slugId = `${specialResourceName}_prefix_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should prioritize exact matches over decoding attempts', () => {
      // If a value looks like it could be decoded but is actually a valid short identifier
      const shortIdentifier = 'exactly-15-chars'; // 15 characters, less than ENCODED_ID_LENGTH
      expect(pipe.transform(shortIdentifier, {} as ArgumentMetadata)).to.equal(shortIdentifier);
    });
  });
});
