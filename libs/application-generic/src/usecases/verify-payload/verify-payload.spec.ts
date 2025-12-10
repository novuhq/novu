import { BadRequestException } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { ITemplateVariable, TemplateVariableTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { merge } from 'lodash';
import { VerifyPayloadCommand } from './verify-payload.command';
import { VerifyPayload } from './verify-payload.usecase';

describe('Verify Payload Usecase', () => {
  const verifyPayload = new VerifyPayload();

  it('should handle empty and undefined strings', () => {
    const template = createTemplate([
      { name: 'user.firstName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'John', required: false },
      { name: 'user.hej', type: TemplateVariableTypeEnum.STRING, required: false, defaultValue: '' },
      { name: 'user.test', type: TemplateVariableTypeEnum.STRING, required: false, defaultValue: undefined },
    ]);

    const payload = {
      user: {
        lastName: 'Doe',
      },
    };

    const result = verifyPayload.execute(
      VerifyPayloadCommand.create({
        payload,
        template: template as NotificationTemplateEntity,
      })
    );

    const final = merge({}, payload, result);

    expect(final.user.lastName).to.eq('Doe');
    expect(final.user.firstName).to.eq('John');
    expect(Object.keys(final.user)).to.not.include('hej');
    expect(Object.keys(final.user)).to.not.include('test');
  });

  it('should fill and merge as expected', () => {
    const template = createTemplate([
      { name: 'user.firstName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'John', required: false },
      { name: 'user.lastName', type: TemplateVariableTypeEnum.STRING, required: true },
    ]);

    const payload = {
      user: {
        lastName: 'Doe',
      },
    };

    const result = verifyPayload.execute(
      VerifyPayloadCommand.create({
        payload,
        template: template as NotificationTemplateEntity,
      })
    );

    const final = merge({}, payload, result);

    expect(final.user.lastName).to.eq('Doe');
    expect(final.user.firstName).to.eq('John');
  });

  it('should respect system variables', () => {
    const template = createTemplate([
      { name: 'subscriber.firstName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'John', required: false },
      { name: 'subscriber.lastName', type: TemplateVariableTypeEnum.STRING, required: true },
    ]);

    const payload = {
      user: {
        lastName: 'Doe',
      },
    };

    const result = verifyPayload.execute(
      VerifyPayloadCommand.create({
        payload,
        template: template as NotificationTemplateEntity,
      })
    );

    expect(Object.keys(result).length).to.eq(0);
  });

  it('should not allow false types', () => {
    const template = createTemplate([
      { name: 'first', type: TemplateVariableTypeEnum.STRING, required: true },
      { name: 'second', type: TemplateVariableTypeEnum.ARRAY, required: true },
      { name: 'third', type: TemplateVariableTypeEnum.BOOLEAN, required: true },
    ]);

    const payload = {
      first: [],
      second: false,
      third: '',
    };

    expect(() => {
      verifyPayload.execute(
        VerifyPayloadCommand.create({
          payload,
          template: template as NotificationTemplateEntity,
        })
      );
    }).to.throw('payload is missing required key(s) and type(s): first (Value), second (Array), third (Boolean)');
  });
});

function createTemplate(variables: ITemplateVariable[]) {
  return {
    steps: [
      {
        template: {
          variables,
        },
      },
    ],
  };
}
