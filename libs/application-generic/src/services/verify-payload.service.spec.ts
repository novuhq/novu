import { TemplateVariableTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { VerifyPayloadService } from './verify-payload.service';

describe('VerifyPayloadService', () => {
  const service = new VerifyPayloadService();

  describe('prototype pollution guard', () => {
    it('should not allow __proto__ pollution via default values', () => {
      const variables = [
        {
          name: '__proto__.polluted',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'yes',
          required: false,
        },
      ];

      const before = ({} as Record<string, unknown>).polluted;
      service.fillDefaults(variables);
      const after = ({} as Record<string, unknown>).polluted;

      expect(before).to.equal(undefined);
      expect(after).to.equal(undefined);
    });

    it('should not allow constructor pollution via default values', () => {
      const variables = [
        {
          name: 'constructor.prototype.polluted',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'yes',
          required: false,
        },
      ];

      const before = ({} as Record<string, unknown>).polluted;
      service.fillDefaults(variables);
      const after = ({} as Record<string, unknown>).polluted;

      expect(before).to.equal(undefined);
      expect(after).to.equal(undefined);
    });

    it('should not allow prototype segment pollution via default values', () => {
      const variables = [
        {
          name: 'user.prototype.polluted',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'yes',
          required: false,
        },
      ];

      const before = ({} as Record<string, unknown>).polluted;
      service.fillDefaults(variables);
      const after = ({} as Record<string, unknown>).polluted;

      expect(before).to.equal(undefined);
      expect(after).to.equal(undefined);
    });

    it('should reject variable path segments outside the allowlist', () => {
      const variables = [
        {
          name: 'user.$invalid',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'value',
          required: false,
        },
      ];

      const result = service.fillDefaults(variables);

      expect(result).to.deep.equal({});
    });

    it('should still set safe nested properties', () => {
      const variables = [
        {
          name: 'user.firstName',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'John',
          required: false,
        },
      ];

      const result = service.fillDefaults(variables);

      expect(result).to.deep.equal({
        user: {
          firstName: 'John',
        },
      });
    });

    it('should fill defaults for bracket-notation path segments', () => {
      const variables = [
        {
          name: 'data.items[0].name',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'fallback',
          required: false,
        },
      ];

      const result = service.fillDefaults(variables);

      expect(result).to.deep.equal({
        data: {
          'items[0]': {
            name: 'fallback',
          },
        },
      });
    });

    it('should preserve scalar prefix defaults when a nested default is incompatible', () => {
      const variables = [
        {
          name: 'user',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'scalar-user',
          required: false,
        },
        {
          name: 'user.firstName',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'John',
          required: false,
        },
      ];

      const result = service.fillDefaults(variables);

      expect(result).to.deep.equal({
        user: 'scalar-user',
      });
    });
  });
});
