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

    it('should return an ordinary object so the payload prototype is not null', () => {
      const variables = [
        {
          name: 'user.firstName',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'John',
          required: false,
        },
      ];

      const result = service.fillDefaults(variables);

      expect(Object.getPrototypeOf(result)).to.equal(Object.prototype);
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

    it('should not allow unsafe inherited property names via default values', () => {
      const variables = [
        {
          name: 'toString.call',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'yes',
          required: false,
        },
      ];
      const toStringCall = Object.prototype.toString.call;

      service.fillDefaults(variables);

      expect(Object.prototype.toString.call).to.equal(toStringCall);
      expect(typeof Object.prototype.toString.call).to.equal('function');
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
          items: [
            {
              name: 'fallback',
            },
          ],
        },
      });
      expect((result.data as { items: Array<{ name: string }> }).items[0].name).to.equal('fallback');
    });

    it('should fill defaults for nested bracket-notation path segments', () => {
      const variables = [
        {
          name: 'payload.items[0].products[1].name',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'widget',
          required: false,
        },
      ];

      const result = service.fillDefaults(variables);

      expect(result).to.deep.equal({
        payload: {
          items: [
            {
              products: [undefined, { name: 'widget' }],
            },
          ],
        },
      });
    });

    it('should fill defaults for chained bracket-notation path segments', () => {
      const variables = [
        {
          name: 'data.matrix[0][1]',
          type: TemplateVariableTypeEnum.STRING,
          defaultValue: 'fallback',
          required: false,
        },
      ];

      const result = service.fillDefaults(variables);

      expect(result).to.deep.equal({
        data: {
          matrix: [[undefined, 'fallback']],
        },
      });
      expect((result.data as { matrix: string[][] }).matrix[0][1]).to.equal('fallback');
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
