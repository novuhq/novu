import { expect } from 'chai';
import { CommandValidationException } from '@novu/application-generic';
import { UpdateIntegrationCommand } from './update-integration.command';

describe('UpdateIntegrationCommand', () => {
  it('rejects integrationId that is not a MongoDB ObjectId', () => {
    expect(() =>
      UpdateIntegrationCommand.create({
        userId: '507f1f77bcf86cd799439011',
        organizationId: '507f1f77bcf86cd799439012',
        integrationId: 'telegram',
      } as UpdateIntegrationCommand)
    ).to.throw(CommandValidationException);
  });
});
