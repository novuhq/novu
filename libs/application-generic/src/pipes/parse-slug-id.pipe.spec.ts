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

  describe('Resource identifiers', () => {
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

    it('should return long workflow identifiers unchanged', () => {
      const identifier = 'dailyDigestPatient';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });

    /*
     * Any 16-character base62 string decodes into a syntactically valid ObjectId,
     * so identifiers of exactly that length used to be swallowed by the decoder.
     */
    it('should return identifiers of exactly the encoded ID length unchanged', () => {
      const identifier = 'exerciseReminder';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });

    it('should return identifiers containing underscores unchanged', () => {
      const identifier = 'welcome_emailToNewUsers1';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });

    it('should return identifiers that look like an unnamed slug unchanged', () => {
      const identifier = `${ShortIsPrefixEnum.WORKFLOW}${encodeBase62('6615943e7ace93b0540ae377')}`;
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });
  });

  describe('Slug IDs with various prefixes', () => {
    it('should decode workflow slug IDs', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const slugId = `welcome-email_${ShortIsPrefixEnum.WORKFLOW}${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode step slug IDs', () => {
      const internalId = '507f1f77bcf86cd799439011';
      const encodedId = encodeBase62(internalId);
      const slugId = `email-step_${ShortIsPrefixEnum.STEP}${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode environment slug IDs', () => {
      const internalId = '507f191e810c19729de860ea';
      const encodedId = encodeBase62(internalId);
      const slugId = `prod_${ShortIsPrefixEnum.ENVIRONMENT}${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode layout slug IDs', () => {
      const internalId = '65f1234567890abcdef12345';
      const encodedId = encodeBase62(internalId);
      const slugId = `default-layout_${ShortIsPrefixEnum.LAYOUT}${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should decode step slug IDs built with the legacy step prefix', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const slugId = `email-step_stp_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should not decode slug IDs with an unknown prefix', () => {
      const encodedId = encodeBase62('6615943e7ace93b0540ae377');
      const slugId = `my-custom-resource_cr_${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(slugId);
    });
  });

  describe('Slugs produced by buildSlug', () => {
    const internalIds = ['6615943e7ace93b0540ae377', '0615943e7ace93b0540ae377', '0015943e7ace93b0540ae377'];
    const names = ['Welcome Email', 'daily-digest', '日本語', 'a'];

    for (const prefix of Object.values(ShortIsPrefixEnum)) {
      it(`should decode every slug built with the '${prefix}' prefix`, () => {
        for (const name of names) {
          for (const internalId of internalIds) {
            const slugId = buildSlug(name, prefix, internalId);
            expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
          }
        }
      });
    }
  });

  describe('Internal IDs with leading zeros in slug format', () => {
    it('should handle decoded IDs with leading zeros', () => {
      const internalIds = ['6615943e7ace93b0540ae377', '0615943e7ace93b0540ae377', '0015943e7ace93b0540ae377'];

      internalIds.forEach((internalId) => {
        const encodedId = encodeBase62(internalId);
        const slugId = `resource_${ShortIsPrefixEnum.WORKFLOW}${encodedId}`;
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

    it('should return slug IDs whose encoded part is not an ObjectId unchanged', () => {
      const slugId = `resource_${ShortIsPrefixEnum.WORKFLOW}0000000000000000`;
      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(slugId);
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
      const slugId = `${longResourceName}_${ShortIsPrefixEnum.WORKFLOW}${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should handle resource names with special characters', () => {
      const internalId = '6615943e7ace93b0540ae377';
      const encodedId = encodeBase62(internalId);
      const specialResourceName = 'resource-with-dashes_and_underscores';
      const slugId = `${specialResourceName}_${ShortIsPrefixEnum.WORKFLOW}${encodedId}`;

      expect(pipe.transform(slugId, {} as ArgumentMetadata)).to.equal(internalId);
    });

    it('should prioritize exact matches over decoding attempts', () => {
      // If a value looks like it could be decoded but is actually a valid identifier
      const identifier = 'exactly-16-chars';
      expect(pipe.transform(identifier, {} as ArgumentMetadata)).to.equal(identifier);
    });
  });
});
