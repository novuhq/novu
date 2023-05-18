import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty } from './chat-oauth-callback.command';
import { expect } from 'chai';

describe('@IsNotEmpty() validator', function () {
  it('should create command with string name', async function () {
    const validateNameCommand = IsNotEmptyNameCommand.create({ name: 'mike' });

    expect(validateNameCommand.name).to.equal('mike');
  });

  it('should throw exception on string null', async function () {
    const noValidation = NameCommand.create({ name: 'null' } as any);

    try {
      const validateNameCommand = IsNotEmptyNameCommand.create({ name: 'null' } as any);
    } catch (e) {
      expect(e.response.message[0]).to.equal('name should not be null');
    }
  });

  it('should throw exception on undefined', async function () {
    const noValidation = NameCommand.create({ name: undefined } as any);

    try {
      const validateNameCommand = IsNotEmptyNameCommand.create({ name: undefined } as any);
    } catch (e) {
      expect(e.response.message[0]).to.equal('name should not be undefined');
    }
  });

  it('should throw exception on undefined null', async function () {
    const noValidation = NameCommand.create({ name: 'undefined' } as any);

    try {
      const validateNameCommand = IsNotEmptyNameCommand.create({ name: 'undefined' } as any);
    } catch (e) {
      expect(e.response.message[0]).to.equal('name should not be undefined');
    }
  });

  it('should throw exception on empty string', async function () {
    const noValidation = NameCommand.create({ name: '' });

    try {
      const validateNameCommand = IsNotEmptyNameCommand.create({ name: '' });
    } catch (e) {
      expect(e.response.message[0]).to.equal('name should not be empty string');
    }
  });
});

export class IsNotEmptyNameCommand extends BaseCommand {
  @IsNotEmpty()
  name?: string;
}

export class NameCommand extends BaseCommand {
  name: string;
}
